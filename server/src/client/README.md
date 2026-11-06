# Client API

| Endpoint                         | Input                                                                      | Success        |
| -------------------------------- | -------------------------------------------------------------------------- | -------------- |
| GET /clients                     | Query: `firstName?`, `lastName?`, 20 characters each                       | 200 `Client[]` |
| GET /clients/by-dob              | Query: `dateOfBirth` (YYYY-MM-DD)                                          | 200 `Client[]` |
| POST /clients                    | `{ client, identifications, photo, employee_password?, notes_action? }`    | 201 `Client`   |
| PATCH /clients/:clientNumber     | `{ client?, identifications?, photo?, employee_password?, notes_action? }` | 200 `Client`   |
| GET /clients/:clientNumber/image | Path number                                                                | 200 image file |

There is no DELETE, PUT or separate hold, status or photo route. Responses include
identifications and `image_url` (null when there is no photo), not the stored path.
The image route returns 404 for an unknown client, no photo or a missing file.

## Rules

- **Create:** requires client details, 2–20 identifications and a photo. Clients must be
  18 or older on the `America/Regina` calendar.
- **Update:** omitted fields, IDs and photos are kept. Supplied IDs replace the whole set.
  `""` clears optional text; only `hold_until` accepts `null`. Unknown and server-owned
  fields return 400.
- **Search:** name search matches case-insensitive prefixes and returns `[]` when both
  names are empty. Searches include deactivated clients.
- **Photos:** PNG or JPEG up to 5 MB, as raw base64. The server chooses a UUID file name.
- **Notes:** non-empty changed notes need `notes_action: "append_signature"` and an
  employee PIN. Clearing notes needs no PIN.
- **Hold:** setting `hold_until` needs a PIN and appends a signed note. Clearing it needs
  no PIN. Submit manual notes separately.
- **Status:** changing `is_active` needs a PIN and appends a signed note. Deactivated
  clients stay searchable, and the ticket API refuses them new tickets.
- **ID types:** new IDs need an active type name. An update may keep an existing inactive
  pair unchanged. Type rows are read `FOR SHARE`, so deactivation cannot race a client save.

Writes run in one transaction and updates lock the client row. Invalid input or PIN
returns 400 (PIN errors include `field: "employee_password"`); a missing client returns 404.
PINs identify the employee; they do not create a login session.

## Tests

From `server/`: `npm test -- src/client`. The specs cover service rules and rollback,
repository SQL, HTTP routes with a mocked pool, and image storage with temporary files.
