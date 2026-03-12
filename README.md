# OPC UA Web Client

A modern, real-time OPC UA client with a powerful web interface. Browse server address spaces, inspect node attributes, subscribe to value changes, poll values periodically, and visualize data in live charts.

## Features

- **Tree Browser** - Navigate the OPC UA server address space with lazy-loaded tree view
- **Node Inspector** - View all node attributes (NodeId, BrowseName, DataType, Value, AccessLevel, etc.)
- **Real-time Subscriptions** - Subscribe to OPC UA data changes via native subscriptions
- **Periodic Polling** - Poll values at configurable intervals
- **Live Charts** - Visualize monitored values over time with Recharts
- **Sample Storage** - Configure max samples per monitored item
- **Dark Theme** - Modern dark UI optimized for industrial monitoring

## Architecture

```
Frontend (React + Vite + TailwindCSS)
    |
    |-- REST API (/api/*) --> FastAPI Backend
    |-- WebSocket (/ws)   --> FastAPI Backend
                                |
                                +--> asyncua --> OPC UA Server
```

## Quick Start

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Node.js 18+
- npm

### Install dependencies

```bash
make install
```

### Run everything (backend + frontend + demo OPC UA server)

```bash
make dev
```

This starts:
- Demo OPC UA server on `opc.tcp://localhost:4840`
- Backend API on `http://localhost:8000`
- Frontend dev server on `http://localhost:5173`

Open http://localhost:5173 and click **Connect**.

### Run individually

```bash
# Demo OPC UA server
make demo

# Backend only
make backend

# Frontend only
make frontend
```

## Development

### Backend

The backend uses FastAPI with asyncua for OPC UA communication:

- `backend/src/opcua_web/main.py` - FastAPI routes and WebSocket handler
- `backend/src/opcua_web/opcua_client.py` - OPC UA client wrapper
- `backend/src/opcua_web/models.py` - Pydantic models

### Frontend

The frontend is built with React, TypeScript, TailwindCSS, and Recharts:

- `frontend/src/App.tsx` - Main application layout and state
- `frontend/src/components/` - UI components
- `frontend/src/api.ts` - API client functions

### Commits

This project uses [Commitizen](https://commitizen-tools.github.io/commitizen/) for conventional commits:

```bash
cz commit
```

## API

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/connect` | Connect to OPC UA server |
| POST | `/api/disconnect` | Disconnect |
| GET | `/api/status` | Connection status |
| GET | `/api/browse?node_id=` | Browse child nodes |
| GET | `/api/node?node_id=` | Get node attributes |
| GET | `/api/read?node_id=` | Read current value |

### WebSocket Protocol (`/ws`)

**Client messages:**
```json
{"type": "subscribe", "node_id": "ns=2;i=1", "interval_ms": 500}
{"type": "unsubscribe", "node_id": "ns=2;i=1"}
{"type": "poll", "node_id": "ns=2;i=1", "interval_ms": 1000}
{"type": "stop_poll", "node_id": "ns=2;i=1"}
```

**Server messages:**
```json
{"type": "data_change", "node_id": "ns=2;i=1", "value": 23.5, "source_timestamp": "...", "server_timestamp": "..."}
{"type": "subscribed", "node_id": "ns=2;i=1"}
{"type": "unsubscribed", "node_id": "ns=2;i=1"}
{"type": "error", "message": "..."}
```

## License

MIT
