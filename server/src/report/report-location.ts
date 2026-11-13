// Location code shapes for the overdue report, written once and used by both the
// service (JavaScript RegExp) and the SQL (PostgreSQL regexp_match), so the two can
// never disagree about which codes belong to a range. Each has two capture groups:
// the sort key's first and second part. The syntax is valid in both regex dialects.

// AB11 -> ['AB', '11']
export const SHELF_LOCATION_PATTERN = '^([A-Z]+)([0-9]+)$';

// RR-A -> ['RR', 'A']
export const LETTERED_LOCATION_PATTERN = '^([A-Z]+)-([A-Z]+)$';
