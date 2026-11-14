import type { XmlReportSourceRow } from './xml-report.repository.js';
import type {
  LeadsOnlineItem,
  LeadsOnlineProperty,
  LeadsOnlineTicket,
} from './xml-report.types.js';

// LeadsOnline wants the two-letter code; the client table may hold the full name.
const PROVINCE_CODES: Record<string, string> = {
  ALBERTA: 'AB',
  'BRITISH COLUMBIA': 'BC',
  MANITOBA: 'MB',
  'NEW BRUNSWICK': 'NB',
  'NEWFOUNDLAND AND LABRADOR': 'NL',
  'NORTHWEST TERRITORIES': 'NT',
  'NOVA SCOTIA': 'NS',
  NUNAVUT: 'NU',
  ONTARIO: 'ON',
  'PRINCE EDWARD ISLAND': 'PE',
  QUEBEC: 'QC',
  SASKATCHEWAN: 'SK',
  YUKON: 'YT',
};

const provinceCode = (province: string) => {
  const name = province.trim().toUpperCase();
  return PROVINCE_CODES[name] ?? name;
};

// LeadsOnline uses whole pounds and inches.
const toPounds = (kg: number) => (kg > 0 ? Math.round(kg * 2.2046226218) : 0);
const toInches = (cm: number) => (cm > 0 ? Math.round(cm / 2.54) : 0);

const sexCode = (gender: string) => {
  const value = gender.trim().toUpperCase();
  if (value === 'MALE' || value === 'M') return 'M';
  if (value === 'FEMALE' || value === 'F') return 'F';
  return '';
};

const itemType = (categoryName: string): LeadsOnlineItem['itemType'] => {
  const name = categoryName.toUpperCase();
  if (name.includes('JEWELRY')) return 'Jewelry';
  if (name.includes('FIREARM')) return 'Firearm';
  return 'Other';
};

const property = (Name: string, Value: unknown): LeadsOnlineProperty => ({
  Name,
  Value: String(Value),
});

// Sold tickets are buys (the shop bought the goods outright); the rest are pawns.
export const ticketType = (
  status: string,
): LeadsOnlineTicket['key']['ticketType'] =>
  status.startsWith('sold') ? 'Buy' : 'Pawn';

// All rows of one ticket (one per item) -> one LeadsOnline ticket.
export const mapXmlReportTicket = (
  rows: XmlReportSourceRow[],
): LeadsOnlineTicket => {
  const ticket = rows[0];
  const type = ticketType(ticket.ticket_status);

  const customerProperties = [
    property('CUSTOMER_STORE_NUMBER', ticket.client_number),
  ];
  if (ticket.middle_name) {
    customerProperties.push(
      property('CUSTOMER_NAME_MIDDLE', ticket.middle_name),
    );
  }
  if (ticket.email) {
    customerProperties.push(property('CUSTOMER_EMAIL', ticket.email));
  }

  return {
    key: {
      ticketType: type,
      ticketnumber: String(ticket.ticket_number),
      ticketDateTime: ticket.ticket_datetime,
    },
    redeemByDate: type === 'Pawn' ? ticket.redeem_by_date : '',
    customer: {
      name: [ticket.first_name, ticket.middle_name, ticket.last_name]
        .filter(Boolean)
        .join(' '),
      fname: ticket.first_name,
      lname: ticket.last_name,
      address1: ticket.address,
      city: ticket.city,
      state: provinceCode(ticket.province),
      postalCode: ticket.postal_code,
      phone: ticket.phone,
      idType: ticket.id_type,
      idNumber: ticket.id_value,
      dob: ticket.date_of_birth,
      weight: toPounds(ticket.weight_kg),
      height: toInches(ticket.height_cm),
      eyeColor: ticket.eye_color,
      hairColor: ticket.hair_color,
      sex: sexCode(ticket.gender),
      extraCustomer: { PropertyValue: customerProperties },
    },
    items: {
      Item: rows
        .filter((row) => row.item_number !== null)
        .map((row) => ({
          make: row.brand_name,
          model: row.model_number,
          serialNumber: row.serial_number,
          description: row.description,
          amount: row.item_amount,
          itemType: itemType(row.category_name),
          itemStatus: type,
          isVoid: false,
          employee: row.employee_name,
          extraItem: {
            PropertyValue: [property('ITEM_QUANTITY', row.quantity)],
          },
        })),
    },
    isVoid: false,
    extraTicket: {
      PropertyValue: [property('TICKET_LOAN_AMOUNT', ticket.ticket_amount)],
    },
  };
};
