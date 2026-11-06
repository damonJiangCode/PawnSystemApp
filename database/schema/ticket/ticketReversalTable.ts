export const createTicketReversalTable = `
  CREATE TABLE IF NOT EXISTS ticket_reversal (
    id BIGSERIAL PRIMARY KEY,
    ticket_number INTEGER NOT NULL REFERENCES ticket(ticket_number),
    previous_status TEXT NOT NULL CHECK (
      previous_status IN ('pawned_expired', 'pawned_picked_up')
    ),
    previous_pickup_datetime TIMESTAMPTZ,
    previous_pickup_amount_paid NUMERIC(10, 2),
    previous_expire_date TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createTicketReversalIndexes = `
  CREATE INDEX IF NOT EXISTS idx_ticket_reversal_ticket_number
  ON ticket_reversal(ticket_number);

  CREATE INDEX IF NOT EXISTS idx_ticket_reversal_reversed_at
  ON ticket_reversal(reversed_at);
`;
