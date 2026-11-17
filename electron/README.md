# Electron

The desktop shell: application lifecycle, native menus, windows and the preload bridge. The
UI lives in `frontend/`, which Electron loads from Vite on port 5173.

- [Main process](src/main/README.md): windows, IPC and the XML report module.
- [Preload](src/preload/README.md): the methods exposed to React.

This folder is the npm workspace `@pawnsystem/electron` and also the Electron app root:
`package.json` `"main"` points to `dist/main/index.js`, compiled from `src/main` as ESM. The
preload stays CommonJS (see [Preload](src/preload/README.md)).

From the repository root:

```bash
npm run dev            # Vite, the server, the main-process compiler and Electron together
npm run build:main     # npm run build -w electron
npm run typecheck:main # npm run typecheck -w electron
```

`npm start -w electron` runs `scripts/start.js`, which starts Electron on this folder. It clears
`ELECTRON_RUN_AS_NODE`, which some terminals set and which stops Electron from opening a window.

Restart Electron after editing main or preload code. This is a development setup; there is
no standalone installer yet.
