# Item API

Items and the tickets they are on (`ticket_item`).

| Endpoint                                        | Success                            |
| ----------------------------------------------- | ---------------------------------- |
| GET /tickets/:ticketNumber/items                | 200 `Item[]`                       |
| POST /tickets/:ticketNumber/items               | 201 `Item`                         |
| PATCH /tickets/:ticketNumber/items/:itemNumber  | 200 `Item`                         |
| DELETE /tickets/:ticketNumber/items/:itemNumber | 204                                |
| POST /tickets/:ticketNumber/items/link          | 200 `Item[]`                       |
| GET /items/search                               | 200 `{ items: Item[], truncated }` |
| GET /items/:itemNumber/image                    | 200 image file                     |

- **Photos:** items carry `image_url` (null when there is no photo), not the stored path.
  The image route returns 404 for an unknown item, no photo or a missing file.
- **List:** an unknown ticket returns `[]`; an invalid ticket number returns 400.
- **Search:** filters are `client_number`, exact `item_number`, `category_id`,
  `subcategory_id` and partial `brand_name`, `model_number`, `serial_number`. No filter
  finds nothing. At most the newest 1000 are returned, with `truncated` set when more matched.
- **Create:** needs a `pawned` or `sold` ticket (404 unknown, 409 closed), an active
  subcategory and a photo. The photo is removed again if the item cannot be saved.
- **Update:** the item must be on that open ticket. A new category must be active; an
  unchanged one may be inactive. Without `photo` the item keeps its image.
- **Delete:** removes the item from the ticket only, because other tickets may use it.
- **Link:** takes `{ item_numbers }` and is all or nothing (404 unknown, 409 active on
  another ticket). Items lock in order, so parallel links cannot take the same item.
