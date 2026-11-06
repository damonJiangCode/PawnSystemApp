import type {
  LeadsOnlineItem,
  LeadsOnlineProperty,
  LeadsOnlineTicket,
  XmlReportSourceRow,
} from "./xml-report.types.ts";

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatLocalDateTime = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatLocalDate(date)} ${hours}:${minutes}`;
};

const PROVINCE_CODES: Record<string, string> = {
  ALBERTA: "AB",
  "BRITISH COLUMBIA": "BC",
  MANITOBA: "MB",
  "NEW BRUNSWICK": "NB",
  "NEWFOUNDLAND AND LABRADOR": "NL",
  "NORTHWEST TERRITORIES": "NT",
  "NOVA SCOTIA": "NS",
  NUNAVUT: "NU",
  ONTARIO: "ON",
  "PRINCE EDWARD ISLAND": "PE",
  QUEBEC: "QC",
  SASKATCHEWAN: "SK",
  YUKON: "YT",
};

const mapProvince = (province: string) => {
  const normalized = province.trim().toUpperCase();
  return PROVINCE_CODES[normalized] ?? normalized;
};

const kilogramsToPounds = (kilograms: number) =>
  kilograms > 0 ? Math.round(kilograms * 2.2046226218) : 0;

const centimetersToInches = (centimeters: number) =>
  centimeters > 0 ? Math.round(centimeters / 2.54) : 0;

const mapSex = (gender: string) => {
  const normalized = gender.trim().toUpperCase();
  if (normalized === "MALE" || normalized === "M") return "M";
  if (normalized === "FEMALE" || normalized === "F") return "F";
  return "";
};

const mapItemType = (categoryName: string): LeadsOnlineItem["itemType"] => {
  const normalized = categoryName.trim().toUpperCase();
  if (normalized.includes("JEWELRY")) return "Jewelry";
  if (normalized.includes("FIREARM")) return "Firearm";
  return "Other";
};

const property = (Name: string, Value: unknown): LeadsOnlineProperty => ({
  Name,
  Value: String(Value),
});

const mapItem = (
  row: XmlReportSourceRow,
  ticketType: LeadsOnlineTicket["key"]["ticketType"],
): LeadsOnlineItem => ({
  make: row.brand_name,
  model: row.model_number,
  serialNumber: row.serial_number,
  description: row.description,
  amount: row.item_amount ?? 0,
  itemType: mapItemType(row.category_name),
  itemStatus: ticketType,
  isVoid: false,
  employee: row.employee_name,
  extraItem: {
    PropertyValue: [property("ITEM_QUANTITY", row.quantity ?? 1)],
  },
});

export const mapXmlReportTicket = (
  rows: XmlReportSourceRow[],
): LeadsOnlineTicket => {
  const source = rows[0];
  const ticketType = source.ticket_status.startsWith("sold") ? "Buy" : "Pawn";
  const customerProperties = [
    property("CUSTOMER_STORE_NUMBER", source.client_number),
  ];

  if (source.middle_name) {
    customerProperties.push(
      property("CUSTOMER_NAME_MIDDLE", source.middle_name),
    );
  }
  if (source.email) {
    customerProperties.push(property("CUSTOMER_EMAIL", source.email));
  }

  return {
    key: {
      ticketType,
      ticketnumber: String(source.ticket_number),
      ticketDateTime: formatLocalDateTime(source.transaction_datetime),
    },
    redeemByDate: ticketType === "Pawn" ? formatLocalDate(source.due_date) : "",
    customer: {
      name: `${source.first_name} ${source.middle_name} ${source.last_name}`
        .replace(/\s+/g, " ")
        .trim(),
      fname: source.first_name,
      lname: source.last_name,
      address1: source.address,
      city: source.city,
      state: mapProvince(source.province),
      postalCode: source.postal_code,
      phone: source.phone,
      idType: source.id_type,
      idNumber: source.id_value,
      dob: source.date_of_birth,
      weight: kilogramsToPounds(source.weight_kg),
      height: centimetersToInches(source.height_cm),
      eyeColor: source.eye_color,
      hairColor: source.hair_color,
      sex: mapSex(source.gender),
      extraCustomer: { PropertyValue: customerProperties },
    },
    items: {
      Item: rows
        .filter((row) => row.item_number !== undefined)
        .map((row) => mapItem(row, ticketType)),
    },
    isVoid: false,
    extraTicket: {
      PropertyValue: [property("TICKET_LOAN_AMOUNT", source.ticket_amount)],
    },
  };
};
