# Admin Module

`admin/` owns small reference-data windows.

## Structure

```text
admin/
  colors/
  holiday/
  location/
```

## Responsibilities

This module owns UI for:

- hair colors
- eye colors
- holiday dates
- locations

Employee admin lives in `modules/employees/admin` because employee is its own
business domain.

## Main Flow

```text
Color windows -> client.api -> HTTP -> ReferenceController -> ReferenceService -> ReferenceRepository
Holiday/location windows -> ticket.api -> preload -> ticket admin handlers -> service -> repo
```

## Review Notes

When reviewing this module, check:

- reference values match migration mappings
- inactive values stay hidden from normal workflows where needed
- admin lists can still show inactive values when needed
