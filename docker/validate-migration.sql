SELECT current_database() AS database;
SELECT 'client' AS subject, count(*) AS rows FROM client
UNION ALL SELECT 'employee', count(*) FROM employee
UNION ALL SELECT 'ticket', count(*) FROM ticket
UNION ALL SELECT 'item', count(*) FROM item
UNION ALL SELECT 'ticket_item', count(*) FROM ticket_item;
SELECT status, count(*) FROM ticket GROUP BY status ORDER BY status;
SELECT status, count(*) AS unknown_locations FROM ticket WHERE location = 'UNKNOWN' GROUP BY status;
SELECT count(*) AS missing_ticket_links FROM ticket_item ti LEFT JOIN ticket t USING(ticket_number) WHERE t.ticket_number IS NULL;
SELECT count(*) AS missing_item_links FROM ticket_item ti LEFT JOIN item i USING(item_number) WHERE i.item_number IS NULL;
WITH stats AS (
  SELECT client_number,
    count(*) FILTER (WHERE status = 'pawned_picked_up')::int AS redeem_count,
    count(*) FILTER (WHERE status = 'pawned_expired')::int AS expire_count,
    count(*) FILTER (WHERE status IN ('sold','sold_expired') OR location = 'BIWK')::int AS sell_count
  FROM ticket WHERE client_number IS NOT NULL GROUP BY client_number
)
SELECT count(*) AS mismatched_client_statistics FROM client c LEFT JOIN stats s USING(client_number)
WHERE c.redeem_count <> coalesce(s.redeem_count,0) OR c.expire_count <> coalesce(s.expire_count,0) OR c.sell_count <> coalesce(s.sell_count,0);
SELECT 'client' AS subject, max(client_number) AS max_number, (SELECT last_value FROM pg_sequences WHERE schemaname='public' AND sequencename=split_part(pg_get_serial_sequence('client','client_number'),'.',2)) AS sequence_value FROM client
UNION ALL SELECT 'ticket', max(ticket_number), (SELECT last_value FROM pg_sequences WHERE schemaname='public' AND sequencename=split_part(pg_get_serial_sequence('ticket','ticket_number'),'.',2)) FROM ticket
UNION ALL SELECT 'item', max(item_number), (SELECT last_value FROM pg_sequences WHERE schemaname='public' AND sequencename=split_part(pg_get_serial_sequence('item','item_number'),'.',2)) FROM item;
SELECT 'client' AS subject, count(*) AS photo_paths FROM client WHERE coalesce(image_path,'') <> ''
UNION ALL SELECT 'item', count(*) FROM item WHERE coalesce(image_path,'') <> '';
