# Copilot AI Agent Instructions for Dyad

## Architecture & Patterns

- **Electron + React + TanStack Router**: The app is a desktop Electron app with a React frontend. Routing is handled by TanStack Router (not Next.js or React Router).
- **IPC Pattern**: All backend/OS operations are performed via IPC. Use `IpcClient.getInstance()` in the renderer to call main process handlers (see `src/ipc/ipc_client.ts`). IPC handlers are registered in `src/ipc/ipc_host.ts` and sub-handlers (e.g., `app_handlers.ts`, `chat_stream_handlers.ts`).
- **Data Fetching/Mutations**: Use TanStack Query for async data (see hooks in `src/hooks/`). Queries/mutations call IPC via `IpcClient`, and cache/invalidate with TanStack Query. See `.cursor/rules/ipc.mdc` for the canonical pattern.
- **State Management**: Use Jotai atoms for global UI state (see `src/atoms/`).
- **Component Tagging**: All React components are auto-tagged with `data-dyad-id` and `data-dyad-name` via custom Vite/webpack plugins (see `@dyad-sh/react-vite-component-tagger` and `@dyad-sh/nextjs-webpack-component-tagger`).

## UI/Styling

- **Design System**: Uses Tailwind CSS with custom glassmorphism/neumorphism classes (`glass-panel`, `neumo-container`, `btn-soft`, etc.) defined in `src/styles/globals.css`.
- **Component Structure**: Major UI is in `src/components/`, with chat, input, and settings as key subfolders.
- **Prompts**: Inspiration prompts are in `src/prompts/inspiration_prompts.tsx` and rendered in a grid on the homepage.

## Testing

- **Framework**: Uses Vitest (`npm run test`, `npm run test:watch`, `npm run test:ui`).
- **Mocks**: Use `vi.mock()` for dependencies. See `src/__tests__/README.md` for IPC and fs mocking patterns.
- **E2E**: Playwright specs are in `e2e-tests/`.

## Developer Workflows

- **Build**: Use Vite configs (`vite.*.config.mts`).
- **Scripts**: Utility scripts in `scripts/` (see `scripts/README.md`).
- **Testing LLMs**: Use `testing/fake-llm-server/` for a local OpenAI-compatible API.

## Conventions & Tips

- **IPC/Query**: Always use the IPC+TanStack Query pattern for data that crosses process boundaries.
- **Component Tagging**: Do not remove `data-dyad-id`/`data-dyad-name` attributes.
- **Styling**: Prefer Tailwind and custom utility classes over inline styles.
- **Routing**: Use TanStack Router conventions for navigation.
- **Settings**: App/user settings are managed via IPC and Jotai.

## Key Files & Directories

- `src/ipc/` — IPC client/host/handlers
- `src/hooks/` — Data fetching/mutation hooks
- `src/components/` — UI components
- `src/atoms/` — Jotai atoms for state
- `src/styles/globals.css` — Design tokens and utility classes
- `e2e-tests/` — Playwright E2E tests
- `scripts/` — Utility scripts
- `.cursor/rules/ipc.mdc` — IPC+Query pattern documentation

---

For new features, follow the IPC+Query+Jotai pattern, use the design system, and prefer modular, testable code. See referenced files for canonical examples.
