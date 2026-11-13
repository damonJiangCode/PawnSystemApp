# Preload

The controlled bridge between React and the main process. It exposes `window.appAPI` with the
`xmlReport` and `window` domains; other domains use HTTP.

```text
frontend module API → getAppApi() → window.appAPI → preload/index.cjs → IPC → main handler
```

Preload only exposes methods, calls IPC channels and subscribes to main-process events. It holds
no business rules, SQL or UI decisions.

Method names match `shared/api-contracts`. Channel names live in
`electron/src/main/ipc/channels.ts`; preload keeps a local copy because it is a CommonJS file, so
the two must stay aligned.
