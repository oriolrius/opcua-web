.PHONY: dev backend frontend demo install install-backend install-frontend

# Run everything together
dev:
	$(MAKE) -j3 demo backend frontend

# Start the demo OPC UA server
demo:
	uvx --from git+https://github.com/oriolrius/opc-ua-demo-server opcua-server

# Start the backend
backend:
	cd backend && uv run uvicorn opcua_web.main:app --reload --host 0.0.0.0 --port 8000

# Start the frontend dev server
frontend:
	cd frontend && npm run dev

# Install all dependencies
install: install-backend install-frontend

install-backend:
	cd backend && uv sync

install-frontend:
	cd frontend && npm install
