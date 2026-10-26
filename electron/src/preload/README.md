# Preload Code Map

`electron/src/preload` is the safe bridge between renderer and main.

Renderer code cannot directly call main-process services. Instead, preload
exposes `window.appAPI`.

## Flow

```text
renderer module api
  -> getAppApi()
  -> window.appAPI
  -> preload/index.cjs
  -> ipcRenderer.invoke(channel, payload)
  -> main handler
```

## Responsibilities

Preload should:

- expose app API methods
- call IPC channels
- return handler results
- subscribe/unsubscribe from main-process events

Preload should not:

- calculate business values
- validate business rules
- know SQL
- format page layout
- decide UI behavior

## Naming

Method names should match the `shared/api-contracts` method names.

IPC channel names live in `electron/src/main/ipc/channels.ts`. Preload keeps a local
channel list because it is a CommonJS file, but the channel names should stay
aligned with main.
