# Item API

Items and the tickets they are on (`ticket_item`). Migration from Electron IPC
is in progress.

| Method + path                                   | Success                            |
| ----------------------------------------------- | ---------------------------------- |
| GET /tickets/:ticketNumber/items                | 200 `Item[]`                       |
| POST /tickets/:ticketNumber/items               | 201 `Item`                         |
| PATCH /tickets/:ticketNumber/items/:itemNumber  | 200 `Item`                         |
| DELETE /tickets/:ticketNumber/items/:itemNumber | 204                                |
| GET /items/search                               | 200 `{ items: Item[], truncated }` |

- An unknown ticket returns `[]`; an invalid ticket number returns 400.
- Search filters: `client_number`, `item_number` (exact; ignores the rest but
  the client), `category_id`, `subcategory_id`, and partial `brand_name`,
  `model_number`, `serial_number`. No filter finds nothing. At most the newest
  1000 are returned; `truncated` is true when more matched.
- Creating an item needs a `pawned` or `sold` ticket (404 unknown, 409 closed)
  and an active subcategory. The required `photo` is saved to `ITEM_IMAGE_DIR`
  and removed again if the item cannot be saved.
- Updating an item needs the same open ticket, and the item must be on it
  (404). A new category must be active; an unchanged one may be inactive.
  Without `photo` the item keeps its image; a replaced file is not deleted.
- Deleting removes the item from the ticket only (same 404/409 checks); the
  item and its photo stay because other tickets may use them.
