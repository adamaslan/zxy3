.PHONY: backend frontend test-backend test-ui compose-up

backend:
	cd backend && uvicorn app.main:app --reload --port 8102

frontend:
	cd frontend && npm run dev:local

test-backend:
	cd backend && pytest

test-ui:
	cd tests && npm test

compose-up:
	docker compose up --build
