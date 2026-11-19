# Preload

The controlled bridge between React and the main process. It exposes `window.appAPI` with only the
`window` domain (opening and focusing windows); every business domain uses HTTP.

```text
frontend/src/api/window.ts → window.appAPI → preload/index.cjs → IPC → main handler
```

Preload only exposes methods, calls IPC channels and subscribes to main-process events. It holds
no business rules, SQL or UI decisions.

This is the one CommonJS file in the project, on purpose: windows run with Electron's sandbox,
and a sandboxed preload must be CommonJS. It is written by hand and not compiled. The main
process loads it from `app.getAppPath()`, so the path does not depend on the working directory.

Method names match `WindowApi` in `shared/payload-contracts/window.contract.ts`. Channel names live in
`electron/src/main/ipc/channels.ts`; preload keeps a local copy because it cannot import the
TypeScript module, so the two must stay aligned.
