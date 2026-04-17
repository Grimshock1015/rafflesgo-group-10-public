# RafflesGo

A modern full-stack application with a React frontend and Fastify backend, using code-first OpenAPI spec generation.

## Project Structure

```
RafflesGo/
├── backend/          # Fastify + TypeScript API server
├── frontend/         # React + Vite + TypeScript SPA
├── openapi/          # Auto-generated OpenAPI spec
└── Makefile          # Root-level task runner
```

## Prerequisites

Install these tools before getting started:

| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) or `nvm install 18` |
| npm | 9+ | Comes with Node.js |
| jq | 1.6+ | `apt install jq` / `brew install jq` / `pacman -S jq` |
| make | any | Usually pre-installed on Linux/macOS |

**Verify installation:**
```bash
node --version     # v18.x or higher
npm --version      # 9.x or higher
jq --version       # jq-1.6 or higher
make --version     # GNU Make
```

## Quick Start

```bash
# 1. Setup .env files based on the instructions in the appendix of the final submission document, details omitted here for security.

# 2. Complete manual steps printed by setup (service account + auth)

# 3. Install dependencies (also sets up git hooks)
npm install && make install

# 4. Generate API spec and client
make generate

# 5. Start backend (terminal 1)
make dev-backend

# 6. Start frontend (terminal 2)
make dev-frontend
```

- Backend API: http://localhost:3000
- Frontend: http://localhost:5173
- API Docs: http://localhost:3000/docs

## Development Workflow

### Adding a New API Endpoint

1. **Define the endpoint in backend** (`backend/src/app.ts`):

   ```typescript
   // Add schema
   const MyResponseSchema = {
     $id: 'MyResponse',
     type: 'object',
     required: ['data'],
     properties: { data: { type: 'string' } },
   } as const;

   // Register schema
   fastify.addSchema(MyResponseSchema);

   // Add route
   fastify.get('/api/my-endpoint', {
     schema: {
       description: 'My endpoint description',
       tags: ['RafflesGo'],
       response: { 200: { $ref: 'MyResponse#' } },
     },
   }, async () => {
     return { data: 'Hello!' };
   });
   ```

2. **Regenerate the API client**:
   ```bash
   make generate
   ```

3. **Use in frontend**:
   ```typescript
   import { RafflesGoService } from './api';
   
   const response = await RafflesGoService.getApiMyEndpoint();
   console.log(response.data);
   ```

### Code-First API Approach

This project uses **code-first** OpenAPI generation:

```
Backend (Fastify schemas) 
    → npm run generate-spec 
    → openapi/spec.json 
    → npm run generate-api 
    → Frontend (type-safe client)
```

- OpenAPI spec is **generated**, not manually written
- The spec is auto-regenerated on `make dev` and `make build`
- Frontend gets fully typed API client with IntelliSense

## Architecture

### Backend (Layered Architecture)

```
backend/src/
├── app.ts          # App setup, routes, schemas
├── index.ts        # Server entry point
├── generate-spec.ts # OpenAPI spec generator
├── handlers/       # Request handlers (for larger apps)
├── services/       # Business logic layer
├── repositories/   # Data access layer
├── entities/       # Domain models
└── plugins/        # Fastify plugins
```

### Frontend (Modular Architecture)

```
frontend/src/
├── api/            # Auto-generated API client (don't edit)
├── assets/         # Static assets (images, fonts, icons)
├── components/     # Shared UI components
├── contexts/       # React Context providers
├── hooks/          # Custom React hooks
├── lib/            # External service clients (Firebase, etc.)
├── pages/          # Route pages
├── styles/         # Global styles and CSS variables
└── test/           # Test setup and utilities
```

## Available Commands

### Root Level

| Command | Description |
|---------|-------------|
| `make test` | Run unit tests (frontend + backend) |
| `make test-integration` | Run integration tests with Firebase emulator, works on Windows |
| `make test-all` | Run both unit and integration tests |

### Backend (`cd backend`)

| Command | Description |
|---------|-------------|
| `make dev` | Start with hot-reload (auto-generates spec) |
| `make build` | Generate spec and compile TypeScript |
| `make test` | Run tests |
| `make generate-spec` | Manually generate OpenAPI spec |

### Frontend (`cd frontend`)

| Command | Description |
|---------|-------------|
| `make dev` | Start Vite dev server |
| `make build` | Build production bundle |
| `make test` | Run tests |
| `make generate-api` | Regenerate API client |

## Git Hooks

Pre-commit hooks are managed by [Husky](https://typicode.github.io/husky/). After running `make install` (which includes `npm install` in the root), the following checks run automatically before each commit:

- `make lint` - ESLint checks
- `make typecheck` - TypeScript type checking
- `make build` - Build both frontend and backend
- `make test` - Run all tests
- OpenAPI spec verification - Ensures spec is up to date

To skip hooks temporarily (not recommended):
```bash
git commit --no-verify -m "message"
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, TypeScript |
| Backend | Fastify, Node.js, TypeScript |
| API Spec | OpenAPI 3.0 (auto-generated) |
| API Client | openapi-typescript-codegen |
| Testing | Vitest, React Testing Library |
