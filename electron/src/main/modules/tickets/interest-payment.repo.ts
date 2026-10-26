import { connect } from "../../../../../database/connection.ts";
type DbClient = Awaited<ReturnType<typeof connect>>;

type AddInterestPaymentPayload = {
  ticket_number: number;
  months_paid: number;
  amount_paid: number;
  payment_datetime: Date;
};

export type InterestPaymentSummary = {
  amountPaid: number;
  monthsPaid: number;
};

export const interestPaymentRepo = {
  loadSummaries: async (
    ticketNumbers: number[],
    dbClient?: DbClient,
  ): Promise<Map<number, InterestPaymentSummary>> => {
    if (!ticketNumbers.length) {
      return new Map();
    }

    const client = dbClient ?? (await connect());
    const query = `
      SELECT
        ticket_number,
        COALESCE(SUM(amount_paid), 0) AS amount_paid,
        COALESCE(SUM(months_paid), 0) AS months_paid
      FROM interest_payment
      WHERE ticket_number = ANY($1::int[])
      GROUP BY ticket_number
    `;

    try {
      const result = await client.query(query, [ticketNumbers]);
      return new Map(
        result.rows.map((row) => [
          Number(row.ticket_number),
          {
            amountPaid: Number(row.amount_paid ?? 0),
            monthsPaid: Number(row.months_paid ?? 0),
          },
        ]),
      );
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },

  addInterestPayment: async (
    payload: AddInterestPaymentPayload,
    dbClient?: DbClient,
  ): Promise<void> => {
    const client = dbClient ?? (await connect());
    const query = `
      INSERT INTO interest_payment (
        ticket_number,
        months_paid,
        amount_paid,
        payment_datetime
      ) VALUES ($1, $2, $3, $4)
    `;

    try {
      await client.query(query, [
        payload.ticket_number,
        payload.months_paid,
        payload.amount_paid,
        payload.payment_datetime,
      ]);
    } finally {
      if (!dbClient) {
        client.release();
      }
    }
  },
};
