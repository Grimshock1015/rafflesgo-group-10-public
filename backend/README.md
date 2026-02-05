# RafflesGo Backend

Fastify-based Node.js API server with TypeScript, Typebox for schema validation, and code-first OpenAPI spec generation.

## Architecture

This project follows a **layered architecture** pattern:

```
Request → Route → Handler → Service → Repository → Database/External Services
```

### Directory Structure

```
src/
├── app.ts                  # Fastify app setup, plugin registration, route registration
├── index.ts                # Server entry point
├── config.ts               # Application configuration (admin emails, roles, etc.)
├── container.ts            # Dependency injection container
│
├── schemas/                # Typebox schemas (e.g., user.schema.ts, auth.schema.ts)
├── routes/                 # Route definitions (e.g., users.routes.ts)
├── handlers/               # Request handlers (e.g., users.handler.ts)
├── services/               # Business logic (e.g., user.service.ts)
├── repositories/           # Data access layer (e.g., user.repository.ts)
├── middleware/             # Request middleware (e.g., auth.middleware.ts)
├── plugins/                # Fastify plugins (e.g., auth.plugin.ts, cors.plugin.ts)
├── lib/                    # External service clients (e.g., firebase-admin.ts)
├── types/                  # TypeScript type utilities
├── entities/               # Domain models (for complex business entities)
└── test/                   # Tests
```

### Layer Responsibilities

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Route** | URL mapping, schema definition, middleware assignment | `GET /api/users` with auth middleware |
| **Handler** | Parse request, call service, format response | Extract params, call `userService.getAllUsers()` |
| **Service** | Business logic, orchestration | Validate business rules, call repository |
| **Repository** | Data access, external API calls | `auth.listUsers()`, database queries |

### Plugins vs Middleware

| Type | When it runs | Purpose | Example |
|------|-------------|---------|---------|
| **Plugin** | Once at startup | Extend Fastify, decorate request/reply | `auth.plugin.ts` - adds `request.user` |
| **Middleware** | Every request (or per-route) | Request-level logic | `verifyToken` - validates JWT |

## Type Safety with Typebox

Schemas are defined using [Typebox](https://github.com/sinclairzx81/typebox) which provides:
- JSON Schema for Fastify validation and OpenAPI docs
- TypeScript types derived from the same schema

```typescript
// schemas/user.schema.ts
import { Type, Static } from '@sinclair/typebox';

export const UserSchema = Type.Object({
  uid: Type.String(),
  email: Type.Optional(Type.String()),
  role: RoleSchema,
});

// TypeScript type derived from schema - they can never diverge!
export type User = Static<typeof UserSchema>;
```

### Using Types in Handlers

```typescript
// handlers/users.handler.ts
import { FastifyRequestTypeBox, FastifyReplyTypeBox } from '../types/fastify';

const ListUsersSchema = {
  response: { 200: ListUsersResponseSchema },
};

export async function listUsersHandler(
  request: FastifyRequestTypeBox<typeof ListUsersSchema>,
  reply: FastifyReplyTypeBox<typeof ListUsersSchema>
) {
  // request.body, request.params, etc. are fully typed
  // return type is validated against schema
}
```

## Dependency Injection

Dependencies are constructed in `container.ts` and accessed via `getContainer()`:

```typescript
// container.ts
export function createContainer(): Container {
  const userRepository = new UserRepository();
  const userService = new UserService(userRepository);
  return { userRepository, userService };
}

// In handlers
const { userService } = getContainer();
```

Benefits:
- Easy to mock for testing
- Clear dependency graph
- No module-level side effects

## Authentication & Authorization

### Auth Flow

1. **Plugin** (`auth.plugin.ts`) - Declares `request.user` exists
2. **Middleware** (`auth.middleware.ts`) - Verifies token, populates `request.user`

### Available Middleware

| Middleware | Purpose |
|------------|---------|
| `verifyToken` | Validates Firebase JWT, populates `request.user` |
| `requireRole('admin')` | Requires user to have specific role |
| `requireAdminEmail` | Requires admin role OR email in `config.adminEmails` |

### Usage in Routes

```typescript
fastify.get('/api/users', {
  schema: {
    security: [{ bearerAuth: [] }],  // For Swagger docs
    // ...
  },
  preHandler: [verifyToken, requireRole('admin')],
}, listUsersHandler);
```

### Admin Configuration

The `adminEmails` list in `config.ts` provides **bootstrap admin access**:

```typescript
export const config = {
  adminEmails: ['admin@example.com'],
  // ...
};
```

#### Why is this needed?

This solves the chicken-and-egg problem: *How does the first admin get admin role if only admins can assign roles?*

#### How it works

| Endpoint | Middleware | Access |
|----------|------------|--------|
| `GET /api/users` | `requireRole('admin')` | Only users with `role: 'admin'` in Firebase custom claims |
| `POST /api/users/change-role` | `requireAdminEmail` | Users with `role: 'admin'` **OR** email in `adminEmails` |

#### Bootstrapping your first admin

1. Add your email to `adminEmails` in `config.ts`
2. Sign in to the app
3. Call `POST /api/users/change-role` with:
   ```json
   { "email": "your-email@example.com", "role": "admin" }
   ```
4. **Sign out and back in** to get a fresh token with the admin claim
5. Now you have full admin access via the role

> **Important**: Custom claims are embedded in the JWT at token creation time. After changing a role, the user must get a fresh token (sign out/in or wait for auto-refresh ~1 hour).

## Getting Started

1. Install dependencies:
   ```bash
   make install
   ```

2. Set up Firebase credentials:
   - Download service account key from Firebase Console
   - Save as `backend/svc-account-key.json`
   - Create `backend/.env`:
     ```
     GOOGLE_APPLICATION_CREDENTIALS=./svc-account-key.json
     ```

3. Run in development mode:
   ```bash
   make dev
   ```

4. Open API documentation:
   ```
   http://localhost:3000/docs
   ```

## Adding a New Endpoint

1. **Create schema** in `schemas/`:
   ```typescript
   // schemas/item.schema.ts
   export const ItemSchema = Type.Object({
     id: Type.String(),
     name: Type.String(),
   });
   export type Item = Static<typeof ItemSchema>;
   ```

2. **Create handler** in `handlers/`:
   ```typescript
   // handlers/items.handler.ts
   export async function getItemHandler(request, reply) {
     const { itemService } = getContainer();
     return itemService.getById(request.params.id);
   }
   ```

3. **Create route** in `routes/`:
   ```typescript
   // routes/items.routes.ts
   export const itemsRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
     fastify.get('/api/items/:id', {
       schema: {
         params: ItemParamsSchema,
         response: { 200: ItemSchema },
       },
     }, getItemHandler);
   };
   ```

4. **Register route** in `app.ts`:
   ```typescript
   await fastify.register(itemsRoutes);
   ```

5. **(If needed)** Add service and repository layers

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Health check | None |
| GET | `/api/hello/:name` | Say hello | Token required |
| GET | `/api/users` | List all users | Admin role |
| POST | `/api/users/change-role` | Change user role | Admin email or role |
| GET | `/docs` | Swagger UI | None |

## Available Commands

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies |
| `make dev` | Start with hot-reload |
| `make build` | Compile TypeScript |
| `make test` | Run tests |
| `make generate-spec` | Generate OpenAPI spec |
| `make clean` | Remove node_modules and dist |

## Firestore Indexes

When your Firestore queries use multiple fields for filtering/ordering, you'll need composite indexes. Define them in `firestore.indexes.json` and deploy with:

```bash
make deploy-indexes PROJECT=<your-project-id>
```

If you run a query that requires an index you haven't deployed, Firestore will return an error with a direct link to create it in the Firebase Console.

See the [Firestore indexes documentation](https://firebase.google.com/docs/firestore/query-data/indexing) for details.
