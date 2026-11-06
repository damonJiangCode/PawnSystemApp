import assert from "node:assert/strict";
import test from "node:test";
import { mapXmlReportTicket } from "./xml-report.mapper.ts";
import type { XmlReportSourceRow } from "./xml-report.types.ts";

const sourceRow: XmlReportSourceRow = {
  ticket_number: 982211,
  transaction_datetime: new Date(2026, 8, 21, 19, 5),
  due_date: new Date(2026, 9, 21),
  ticket_amount: 21,
  ticket_status: "pawned",
  employee_name: "TASH",
  client_number: 8688,
  first_name: "DARLENE",
  last_name: "DREAVER",
  middle_name: "JEAN",
  date_of_birth: "1968-06-22",
  gender: "FEMALE",
  hair_color: "BLACK",
  eye_color: "BROWN",
  height_cm: 170.2,
  weight_kg: 54.4,
  address: "APT 104 14 ASSINIBOINE DRIVE",
  city: "SASKATOON",
  province: "Saskatchewan",
  postal_code: "S7N0K7",
  phone: "3063844714",
  email: "",
  id_type: "Health Card",
  id_value: "490189806",
  item_number: 1,
  quantity: 1,
  category_name: "Electronics",
  description: "PHONE",
  brand_name: "SAMSUNG",
  model_number: "MODEL",
  serial_number: "SERIAL",
  item_amount: 21,
};

test("maps metric client measurements to whole imperial values", () => {
  const ticket = mapXmlReportTicket([sourceRow]);

  assert.equal(ticket.customer.weight, 120);
  assert.equal(ticket.customer.height, 67);
});

test("maps a Canadian province name to its postal abbreviation", () => {
  const ticket = mapXmlReportTicket([sourceRow]);

  assert.equal(ticket.customer.state, "SK");
});
