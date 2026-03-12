.PHONY: dev backend frontend demo install install-backend install-frontend test test-e2e test-integration

# Run everything together
dev:
	$(MAKE) -j3 demo backend frontend

# Start the demo OPC UA server
demo:
	uvx --from git+https://github.com/oriolrius/opc-ua-demo-server opcua-server

# Start the backend
backend:
	cd backend && uv run uvicorn opcua_web.main:app --reload --host 0.0.0.0 --port 8765

# Start the frontend dev server
frontend:
	cd frontend && npm run dev

# Install all dependencies
install: install-backend install-frontend

install-backend:
	cd backend && uv sync

install-frontend:
	cd frontend && npm install

# Run unit E2E tests (mocked backend, no server required)
test-e2e:
	cd frontend && npm run test:e2e

# Run integration tests (starts demo OPC UA server v1.2.1 + backend + frontend)
test-integration:
	cd frontend && npm run test:integration

# Run all tests
test: test-e2e test-integration
