export const createItemWithStatusView = `
  CREATE OR REPLACE VIEW item_with_status AS
  SELECT
    i.item_number,
    i.quantity,
    i.subcategory_id,
    c.name AS category_name,
    s.name AS subcategory_name,
    i.description,
    i.brand_name,
    i.model_number,
    i.serial_number,
    i.amount,
    latest_ticket.ticket_number AS latest_ticket_number,
    latest_ticket.status AS latest_ticket_status,
    i.image_path
  FROM item i
  LEFT JOIN item_subcategory s
    ON s.id = i.subcategory_id
  LEFT JOIN item_category c
    ON c.id = s.category_id
  LEFT JOIN LATERAL (
    SELECT t.ticket_number, t.status
    FROM ticket_item ti
    INNER JOIN ticket t
      ON t.ticket_number = ti.ticket_number
    WHERE ti.item_number = i.item_number
    ORDER BY t.transaction_datetime DESC, ti.ticket_number DESC
    LIMIT 1
  ) latest_ticket ON TRUE;
`;
