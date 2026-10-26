export interface Ticket {
  ticket_number?: number;
  transaction_datetime: Date;
  is_lost: boolean;
  is_stolen: boolean;
  location: string;
  description: string;
  due_date: Date;
  amount: number;
  onetime_fee: number;
  interest_paid_months: number;
  recorded_interest_amount_paid?: number;
  recorded_interest_months_paid?: number;
  partial_payment: number;
  partial_payment_datetime?: Date;
  interested_datetime?: Date;
  employee_name: string;
  pickup_datetime?: Date;
  pickup_amount_paid?: number;
  expire_date?: Date;
  status:
    | "pawned"
    | "pawned_expired"
    | "pawned_picked_up"
    | "sold"
    | "sold_expired";
  status_updated_at: Date;
  client_number: number;
}
