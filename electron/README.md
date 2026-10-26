# Electron desktop

- `src/main/index.ts`: application lifecycle and native menus.
- `src/main/window/`: window creation, focus, sizing and renderer URLs.
- `src/main/ipc/`: registration and channel names for the preload bridge.
- `src/main/image/`: controlled legacy image protocol.
- `src/main/modules/`: remaining business workflows, pending HTTP conversion.
- `src/preload/index.cjs`: controlled methods exposed to the React frontend.
- `tsconfig.json`: main-process compilation; output is root `.electron-build/`.

From the repository root, `npm run dev` starts all development processes.
`npm run build:main` compiles Electron plus its shared/database dependencies;
`npm run typecheck:main` checks without emitting files. Dependencies and commands
are managed by the root `package.json`.

The UI lives in `frontend/`. Electron loads Vite on port 5173 and currently
requires a restart after main/preload edits. This is a development desktop setup,
not a standalone installer configuration.
