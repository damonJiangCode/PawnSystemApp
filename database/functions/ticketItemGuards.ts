export const createPreventItemMultiplePawnedTicketsFunction = `
  CREATE OR REPLACE FUNCTION prevent_item_multiple_pawned_tickets()
  RETURNS trigger AS $$
  DECLARE
    target_ticket_status TEXT;
    conflicting_ticket_number INTEGER;
  BEGIN
    SELECT status
    INTO target_ticket_status
    FROM ticket
    WHERE ticket_number = NEW.ticket_number;

    IF target_ticket_status IN ('pawned', 'sold') THEN
      SELECT ti.ticket_number
      INTO conflicting_ticket_number
      FROM ticket_item ti
      INNER JOIN ticket t
        ON t.ticket_number = ti.ticket_number
      WHERE ti.item_number = NEW.item_number
        AND ti.ticket_number <> NEW.ticket_number
        AND t.status IN ('pawned', 'sold')
      LIMIT 1;

      IF conflicting_ticket_number IS NOT NULL THEN
        RAISE EXCEPTION
          'Item % is already active on ticket %',
          NEW.item_number,
          conflicting_ticket_number;
      END IF;
    END IF;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`;

export const createPreventItemMultiplePawnedTicketsTrigger = `
  DROP TRIGGER IF EXISTS trg_prevent_item_multiple_pawned_tickets
  ON ticket_item;

  CREATE TRIGGER trg_prevent_item_multiple_pawned_tickets
  BEFORE INSERT OR UPDATE ON ticket_item
  FOR EACH ROW
  EXECUTE FUNCTION prevent_item_multiple_pawned_tickets();
`;

export const createPreventTicketWithConflictingPawnedItemsFunction = `
  CREATE OR REPLACE FUNCTION prevent_ticket_with_conflicting_pawned_items()
  RETURNS trigger AS $$
  DECLARE
    conflicting_item_number INTEGER;
    conflicting_ticket_number INTEGER;
  BEGIN
    IF NEW.status IN ('pawned', 'sold') THEN
      SELECT current_items.item_number, other_ti.ticket_number
      INTO conflicting_item_number, conflicting_ticket_number
      FROM ticket_item current_items
      INNER JOIN ticket_item other_ti
        ON other_ti.item_number = current_items.item_number
       AND other_ti.ticket_number <> NEW.ticket_number
      INNER JOIN ticket other_ticket
        ON other_ticket.ticket_number = other_ti.ticket_number
      WHERE current_items.ticket_number = NEW.ticket_number
        AND other_ticket.status IN ('pawned', 'sold')
      LIMIT 1;

      IF conflicting_item_number IS NOT NULL THEN
        RAISE EXCEPTION
          'Item % is already active on ticket %',
          conflicting_item_number,
          conflicting_ticket_number;
      END IF;
    END IF;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`;

export const createPreventTicketWithConflictingPawnedItemsTrigger = `
  DROP TRIGGER IF EXISTS trg_prevent_ticket_with_conflicting_pawned_items
  ON ticket;

  CREATE TRIGGER trg_prevent_ticket_with_conflicting_pawned_items
  BEFORE UPDATE OF status ON ticket
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ticket_with_conflicting_pawned_items();
`;
