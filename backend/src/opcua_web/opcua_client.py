import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from asyncua import Client, ua

logger = logging.getLogger(__name__)


def serialize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.hex()
    if isinstance(value, (int, float, str, bool)):
        return value
    if isinstance(value, (list, tuple)):
        return [serialize_value(v) for v in value]
    if isinstance(value, ua.NodeId):
        return value.to_string()
    if isinstance(value, ua.QualifiedName):
        return value.to_string()
    if isinstance(value, ua.LocalizedText):
        return value.Text
    if isinstance(value, ua.StatusCode):
        return value.name
    return str(value)


class OPCUAManager:
    def __init__(self):
        self.client: Client | None = None
        self.url: str | None = None
        self.connected: bool = False

    async def connect(self, url: str):
        if self.connected:
            await self.disconnect()
        self.client = Client(url)
        self.client.session_timeout = 30000
        await self.client.connect()
        self.url = url
        self.connected = True
        logger.info(f"Connected to {url}")

    async def disconnect(self):
        if self.client:
            try:
                await self.client.disconnect()
            except Exception:
                pass
        self.client = None
        self.url = None
        self.connected = False
        logger.info("Disconnected")

    async def browse(self, node_id: str | None = None) -> list[dict]:
        if not self.client or not self.connected:
            raise RuntimeError("Not connected to any OPC UA server")

        if node_id:
            node = self.client.get_node(node_id)
        else:
            node = self.client.nodes.objects

        children = await node.get_children()
        result = []
        for child in children:
            try:
                browse_name = await child.read_browse_name()
                display_name = await child.read_display_name()
                node_class = await child.read_node_class()
                sub_children = await child.get_children()
                result.append({
                    "node_id": child.nodeid.to_string(),
                    "browse_name": browse_name.to_string(),
                    "display_name": display_name.Text,
                    "node_class": node_class.value,
                    "has_children": len(sub_children) > 0,
                })
            except Exception as e:
                logger.warning(f"Error browsing child {child}: {e}")
        return result

    async def get_node_attributes(self, node_id: str) -> dict:
        if not self.client or not self.connected:
            raise RuntimeError("Not connected to any OPC UA server")

        node = self.client.get_node(node_id)
        attrs: dict[str, Any] = {"node_id": node_id}

        try:
            attrs["browse_name"] = (await node.read_browse_name()).to_string()
        except Exception:
            attrs["browse_name"] = "Unknown"

        try:
            attrs["display_name"] = (await node.read_display_name()).Text
        except Exception:
            attrs["display_name"] = "Unknown"

        try:
            nc = await node.read_node_class()
            attrs["node_class"] = nc.name
        except Exception:
            attrs["node_class"] = "Unknown"

        try:
            val = await node.read_value()
            attrs["value"] = serialize_value(val)
        except Exception:
            attrs["value"] = None

        try:
            dt = await node.read_data_type_as_variant_type()
            attrs["data_type"] = dt.name
        except Exception:
            attrs["data_type"] = None

        try:
            desc = await node.read_description()
            attrs["description"] = desc.Text if desc.Text else None
        except Exception:
            attrs["description"] = None

        try:
            access = await node.read_attribute(ua.AttributeIds.AccessLevel)
            attrs["access_level"] = access.Value.Value
            attrs["writable"] = bool(access.Value.Value & ua.AccessLevel.CurrentWrite)
        except Exception:
            attrs["access_level"] = None
            attrs["writable"] = False

        try:
            hist = await node.read_attribute(ua.AttributeIds.Historizing)
            attrs["historizing"] = hist.Value.Value
        except Exception:
            attrs["historizing"] = False

        try:
            msi = await node.read_attribute(ua.AttributeIds.MinimumSamplingInterval)
            attrs["minimum_sampling_interval"] = msi.Value.Value
        except Exception:
            attrs["minimum_sampling_interval"] = None

        return attrs

    async def read_value(self, node_id: str) -> dict:
        if not self.client or not self.connected:
            raise RuntimeError("Not connected to any OPC UA server")

        node = self.client.get_node(node_id)
        data_value = await node.read_data_value()
        return {
            "node_id": node_id,
            "value": serialize_value(data_value.Value.Value),
            "status": data_value.StatusCode.name if data_value.StatusCode else None,
            "source_timestamp": data_value.SourceTimestamp.isoformat() if data_value.SourceTimestamp else None,
            "server_timestamp": data_value.ServerTimestamp.isoformat() if data_value.ServerTimestamp else None,
        }

    async def create_subscription(self, handler, period: int = 500):
        if not self.client or not self.connected:
            raise RuntimeError("Not connected to any OPC UA server")
        return await self.client.create_subscription(period, handler)

    def get_node(self, node_id: str):
        if not self.client or not self.connected:
            raise RuntimeError("Not connected to any OPC UA server")
        return self.client.get_node(node_id)
