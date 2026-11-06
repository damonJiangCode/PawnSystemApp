export const createTicketItemTable = `
  CREATE TABLE IF NOT EXISTS ticket_item (
    ticket_number INTEGER NOT NULL REFERENCES ticket(ticket_number),
    item_number INTEGER NOT NULL REFERENCES item(item_number),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ticket_number, item_number)
  );
`;

export const createTicketItemIndexes = `
  CREATE INDEX IF NOT EXISTS idx_ticket_item_item_number
  ON ticket_item(item_number);
`;
