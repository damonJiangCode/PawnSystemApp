import { describe, expect, it } from 'vitest';
import { mapXmlReportTicket, ticketType } from './xml-report.mapper.js';
import type { XmlReportSourceRow } from './xml-report.repository.js';

// Made-up client and ticket.
const row: XmlReportSourceRow = {
  ticket_number: 1001,
  ticket_datetime: '2026-09-21 19:05',
  redeem_by_date: '2026-10-21',
  ticket_amount: 40,
  ticket_status: 'pawned',
  employee_name: 'SAM',
  client_number: 42,
  first_name: 'JANE',
  last_name: 'SAMPLE',
  middle_name: 'Q',
  date_of_birth: '1990-01-02',
  gender: 'FEMALE',
  hair_color: 'BROWN',
  eye_color: 'BLUE',
  height_cm: 170.2,
  weight_kg: 54.4,
  address: '1 TEST STREET',
  city: 'SASKATOON',
  province: 'Saskatchewan',
  postal_code: 'S7N0A0',
  phone: '3065550100',
  email: '',
  id_type: 'Health Card',
  id_value: '000000000',
  item_number: 1,
  quantity: 2,
  category_name: 'Jewelry & Watches',
  description: 'RING',
  brand_name: 'ACME',
  model_number: 'M1',
  serial_number: 'S1',
  item_amount: 40,
};

describe('mapXmlReportTicket', () => {
  it('keeps the shop-time date strings from the database', () => {
    const ticket = mapXmlReportTicket([row]);

    expect(ticket.key).toEqual({
      ticketType: 'Pawn',
      ticketnumber: '1001',
      ticketDateTime: '2026-09-21 19:05',
    });
    expect(ticket.redeemByDate).toBe('2026-10-21');
    expect(ticket.customer.dob).toBe('1990-01-02');
  });

  it('converts the client to LeadsOnline units and codes', () => {
    const { customer } = mapXmlReportTicket([row]);

    expect(customer).toMatchObject({
      name: 'JANE Q SAMPLE',
      state: 'SK',
      weight: 120,
      height: 67,
      sex: 'F',
    });
    expect(customer.extraCustomer.PropertyValue).toEqual([
      { Name: 'CUSTOMER_STORE_NUMBER', Value: '42' },
      { Name: 'CUSTOMER_NAME_MIDDLE', Value: 'Q' },
    ]);
  });

  it('maps every item row and skips the empty one of a ticket without items', () => {
    const second = { ...row, item_number: 2, category_name: 'Tools' };

    expect(mapXmlReportTicket([row, second]).items.Item).toMatchObject([
      { itemType: 'Jewelry', itemStatus: 'Pawn', employee: 'SAM' },
      { itemType: 'Other' },
    ]);
    expect(
      mapXmlReportTicket([{ ...row, item_number: null }]).items.Item,
    ).toEqual([]);
  });

  it('sends sold tickets as buys without a redeem date', () => {
    const ticket = mapXmlReportTicket([{ ...row, ticket_status: 'sold' }]);

    expect(ticket.key.ticketType).toBe('Buy');
    expect(ticket.redeemByDate).toBe('');
    expect(ticketType('sold_expired')).toBe('Buy');
    expect(ticketType('pawned_picked_up')).toBe('Pawn');
  });
});
