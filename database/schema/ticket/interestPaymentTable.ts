export const createInterestPaymentTable = `
  CREATE TABLE IF NOT EXISTS interest_payment (
    id BIGSERIAL PRIMARY KEY,
    ticket_number INTEGER NOT NULL REFERENCES ticket(ticket_number),
    months_paid INTEGER NOT NULL CHECK (months_paid > 0),
    amount_paid NUMERIC(10, 2) NOT NULL CHECK (amount_paid >= 0),
    payment_datetime TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createInterestPaymentIndexes = `
  CREATE INDEX IF NOT EXISTS idx_interest_payment_datetime
  ON interest_payment(payment_datetime);

  CREATE INDEX IF NOT EXISTS idx_interest_payment_ticket_number
  ON interest_payment(ticket_number);
`;
