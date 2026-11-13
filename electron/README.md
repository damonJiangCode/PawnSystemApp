# Electron

The desktop shell: application lifecycle, native menus, windows and the preload bridge. The
UI lives in `frontend/`, which Electron loads from Vite on port 5173.

- [Main process](src/main/README.md): windows, IPC and the XML report module.
- [Preload](src/preload/README.md): the methods exposed to React.

From the repository root:

```bash
npm run dev
npm run build:main
npm run typecheck:main
```

Restart Electron after editing main or preload code. This is a development setup; there is
no standalone installer yet.
