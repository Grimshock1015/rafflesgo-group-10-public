# RafflesGo Frontend

React + TypeScript SPA with auto-generated API client from OpenAPI spec.

## Directory Structure

| Directory | Description |
|-----------|-------------|
| `src/api/` | Auto-generated API client from OpenAPI spec (do not edit manually) |
| `src/assets/` | Static assets like images, fonts, and icons |
| `src/components/` | Shared, reusable UI components (buttons, modals, forms, etc.) |
| `src/contexts/` | React Context providers for global state (auth, theme, etc.) |
| `src/hooks/` | Custom React hooks for shared logic |
| `src/lib/` | External service clients and utilities (Firebase, analytics, etc.) |
| `src/pages/` | Top-level page components mapped to routes |
| `src/styles/` | Global styles, CSS variables, and base styles |
| `src/test/` | Test setup and utilities |

## Getting Started

1. Install dependencies:
   ```bash
   make install
   ```

2. Run in development mode (auto-generates API client):
   ```bash
   make dev
   ```

3. Build for production:
   ```bash
   make build
   ```

4. Run tests:
   ```bash
   make test
   ```

## Using the Generated API Client

The API client is auto-generated from the backend's OpenAPI spec using `openapi-typescript-codegen`.

### Importing Services

```typescript
import { RafflesGoService } from './api';
```

### Making API Calls

The generated client provides type-safe methods for each endpoint:

```typescript
// GET /api/health
const health = await RafflesGoService.getApiHealth();
console.log(health.status); // "OK"

// GET /api/hello/:name
const hello = await RafflesGoService.getApiHello('World');
console.log(hello.message); // "Hello, World!"
```

### Using Types

Response types are also exported:

```typescript
import { HealthResponse, HelloResponse } from './api';

const [health, setHealth] = useState<HealthResponse | null>(null);
```

### Error Handling

```typescript
import { RafflesGoService, ApiError } from './api';

try {
  const data = await RafflesGoService.getApiHealth();
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error: ${error.status} - ${error.message}`);
  }
}
```

## Testing

Tests use **Vitest** with **React Testing Library (RTL)** and **jsdom**.

### Running Tests

```bash
make test
# or
npm run test
```

### Writing Tests

Tests are located in `src/test/`. Example test with API mocking:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock the API
vi.mock('../api', () => ({
  RafflesGoService: {
    getApiHealth: vi.fn(),
  },
}));

import { RafflesGoService } from '../api';

describe('App', () => {
  it('shows healthy status when API returns OK', async () => {
    vi.mocked(RafflesGoService.getApiHealth).mockResolvedValue({ status: 'OK' });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Backend is healthy')).toBeInTheDocument();
    });
  });

  it('increments counter on click', async () => {
    vi.mocked(RafflesGoService.getApiHealth).mockResolvedValue({ status: 'OK' });
    const user = userEvent.setup();

    render(<App />);

    const button = screen.getByRole('button', { name: /count is 0/i });
    await user.click(button);
    expect(screen.getByRole('button', { name: /count is 1/i })).toBeInTheDocument();
  });
});
```

### Test Utilities

- `@testing-library/react` - Component rendering and queries
- `@testing-library/user-event` - User interaction simulation
- `@testing-library/jest-dom` - Custom DOM matchers (e.g., `toBeInTheDocument()`)
- `vitest` - Test runner with `vi.mock()` for mocking

## Regenerating the API Client

The API client is auto-generated on `dev` and `build`. To manually regenerate:

```bash
make generate-api
```

### What Gets Generated

```
src/api/
├── core/                 # Request utilities, error handling
├── models/               # TypeScript types (HealthResponse, etc.)
├── services/             # API methods (RafflesGoService, etc.)
└── index.ts              # Re-exports everything
```

**Important:** Never edit files in `src/api/` manually - they will be overwritten.

## Styles

Styles are organized in `src/styles/`:

```
src/styles/
├── index.css       # Main entry point (imports all others)
├── variables.css   # CSS custom properties / design tokens
├── reset.css       # CSS reset / normalize
└── base.css        # Base element styles (buttons, links, etc.)
```

### CSS Modules

Component-specific styles use CSS Modules (e.g., `App.module.css`):

```typescript
import styles from './MyComponent.module.css';

function MyComponent() {
  return <div className={styles.container}>...</div>;
}
```

### Design Tokens

CSS variables are defined in `variables.css`:

```css
:root {
  --color-primary: #646cff;
  --color-success: #22c55e;
  --color-error: #ef4444;
  --spacing-md: 1rem;
  --radius-md: 8px;
}
```

Use them in your styles:

```css
.myButton {
  background: var(--color-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}
```

## Available Commands

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies |
| `make dev` | Start Vite dev server (auto-generates API client) |
| `make build` | Build production bundle (auto-generates API client) |
| `make test` | Run tests |
| `make generate-api` | Manually regenerate API client |
| `make clean` | Remove node_modules and dist |
