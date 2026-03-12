import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .models import BrowseNode, ConnectRequest, ConnectionStatus, NodeAttribute
from .opcua_client import OPCUAManager, serialize_value

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

manager = OPCUAManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await manager.disconnect()


app = FastAPI(title="OPC UA Web Client", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/connect")
async def connect(req: ConnectRequest):
    try:
        await manager.connect(
            url=req.url,
            security_mode=req.security_mode,
            username=req.username,
            password=req.password,
        )
        return {"status": "connected", "url": req.url, "security_mode": req.security_mode}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/disconnect")
async def disconnect():
    await manager.disconnect()
    return {"status": "disconnected"}


@app.get("/api/status", response_model=ConnectionStatus)
async def status():
    return ConnectionStatus(connected=manager.connected, url=manager.url)


@app.get("/api/browse", response_model=list[BrowseNode])
async def browse(node_id: str | None = Query(None)):
    if not manager.connected:
        raise HTTPException(status_code=400, detail="Not connected")
    try:
        nodes = await manager.browse(node_id)
        return nodes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/node")
async def get_node(node_id: str = Query(...)):
    if not manager.connected:
        raise HTTPException(status_code=400, detail="Not connected")
    try:
        return await manager.get_node_attributes(node_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/read")
async def read_value(node_id: str = Query(...)):
    if not manager.connected:
        raise HTTPException(status_code=400, detail="Not connected")
    try:
        return await manager.read_value(node_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    subscription = None
    handles: dict[str, list] = {}
    poll_tasks: dict[str, asyncio.Task] = {}

    class DataChangeHandler:
        def __init__(self, ws: WebSocket):
            self.ws = ws

        async def datachange_notification(self, node, val, data):
            try:
                node_id = node.nodeid.to_string()
                src_ts = data.monitored_item.Value.SourceTimestamp
                srv_ts = data.monitored_item.Value.ServerTimestamp
                await self.ws.send_json({
                    "type": "data_change",
                    "node_id": node_id,
                    "value": serialize_value(val),
                    "source_timestamp": src_ts.isoformat() if src_ts else None,
                    "server_timestamp": srv_ts.isoformat() if srv_ts else None,
                })
            except Exception as e:
                logger.error(f"Error in datachange_notification: {e}")

    handler = DataChangeHandler(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("type")

            if action == "subscribe":
                node_id = data["node_id"]
                try:
                    if not subscription:
                        subscription = await manager.create_subscription(handler, period=data.get("interval_ms", 500))
                    node = manager.get_node(node_id)
                    handle = await subscription.subscribe_data_change(node)
                    handles[node_id] = handle
                    await websocket.send_json({"type": "subscribed", "node_id": node_id})
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": f"Subscribe failed: {e}", "node_id": node_id})

            elif action == "unsubscribe":
                node_id = data["node_id"]
                try:
                    if node_id in handles and subscription:
                        await subscription.unsubscribe(handles[node_id])
                        del handles[node_id]
                    if node_id in poll_tasks:
                        poll_tasks[node_id].cancel()
                        del poll_tasks[node_id]
                    await websocket.send_json({"type": "unsubscribed", "node_id": node_id})
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": f"Unsubscribe failed: {e}", "node_id": node_id})

            elif action == "poll":
                node_id = data["node_id"]
                interval_ms = data.get("interval_ms", 1000)

                async def poll_loop(nid: str, interval: int):
                    node = manager.get_node(nid)
                    while True:
                        try:
                            dv = await node.read_data_value()
                            await websocket.send_json({
                                "type": "data_change",
                                "node_id": nid,
                                "value": serialize_value(dv.Value.Value),
                                "source_timestamp": dv.SourceTimestamp.isoformat() if dv.SourceTimestamp else datetime.now(timezone.utc).isoformat(),
                                "server_timestamp": dv.ServerTimestamp.isoformat() if dv.ServerTimestamp else datetime.now(timezone.utc).isoformat(),
                            })
                        except Exception as e:
                            await websocket.send_json({"type": "error", "message": str(e), "node_id": nid})
                        await asyncio.sleep(interval / 1000)

                if node_id in poll_tasks:
                    poll_tasks[node_id].cancel()
                poll_tasks[node_id] = asyncio.create_task(poll_loop(node_id, interval_ms))
                await websocket.send_json({"type": "polling", "node_id": node_id, "interval_ms": interval_ms})

            elif action == "stop_poll":
                node_id = data["node_id"]
                if node_id in poll_tasks:
                    poll_tasks[node_id].cancel()
                    del poll_tasks[node_id]
                await websocket.send_json({"type": "poll_stopped", "node_id": node_id})

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        for task in poll_tasks.values():
            task.cancel()
        if subscription:
            try:
                await subscription.delete()
            except Exception:
                pass
