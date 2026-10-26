# Shared Code Map

`shared` contains TypeScript shapes and pure utilities used by both
renderer and main.

It is not a UI shared folder. Renderer-only shared code belongs in
`frontend/src/shared`.

## Structure

```text
shared/
  models/
  payload-contracts/
  api-contracts/
  utils/
  test/
```

## Models

`models/` contains business data shapes.

Examples:

- `client.model.ts`
- `ticket.model.ts`
- `item.model.ts`
- `employee.model.ts`
- `location.model.ts`

Use models for data that exists as app business objects.

## Payload Contracts

`payload-contracts/` contains method inputs and result shapes.

Examples:

- `CreatePawnTicketInput`
- `UpdateTicketInput`
- `SearchItemsInput`
- `OpenItemSearchWindowInput`

Use payload contracts when data exists because an API method needs to receive or
return it.

## API Contracts

`api-contracts/` contains method shapes exposed through `window.appAPI`.

Examples:

- `AppApi`
- `ClientApi`
- `TicketApi`
- `ItemApi`
- `WindowApi`

These files describe the communication surface. They should not implement
business logic.

These are contracts, not renderer wrappers.

```text
api-contracts
  = what appAPI methods exist
  = what input and return type each method has
  = shared by renderer, preload, and main

frontend/src/modules/*/*.api.ts
  = wrapper used by UI code
  = calls getAppApi()
  = belongs to the renderer module that uses it
```

Example:

```text
api-contracts/itemApi.contract.ts
  defines item.searchItems(input)

frontend/src/modules/items/item.api.ts
  exports itemApi.searchItems(input)
  calls getAppApi()?.item.searchItems(input)
```

## Utils

`utils/` contains pure shared logic.

Examples:

- interest and ticket amount calculations
- holiday-aware date calculation

Rules:

- no React
- no Electron
- no database connection
- no filesystem access

## Naming Rule

Use this split:

```text
models = business data
payload-contracts = input/result shapes
api-contracts = method shapes
utils = pure shared behavior
```
