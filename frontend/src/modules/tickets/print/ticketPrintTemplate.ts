import type { Client } from "../../../../../shared/models/client.model";
import type { Ticket } from "../../../../../shared/models/ticket.model";
import { calculation } from "../../../../../shared/utils/calculation";

export type PrintClient = Pick<
  Client,
  | "client_number"
  | "first_name"
  | "last_name"
  | "middle_name"
  | "address"
  | "city"
  | "province"
>;

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatMoney = (value: number) => {
  const rounded = Number(value.toFixed(2));
  return rounded % 1 === 0
    ? `$${rounded.toFixed(0)}`
    : `$${rounded.toFixed(1)}`;
};

const formatTicketDate = (value: Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const addDays = (value: Date, days: number) => {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const formatClientName = (client?: PrintClient) =>
  [client?.last_name, client?.first_name, client?.middle_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toUpperCase())
    .join(" ");

const formatCityProvince = (client?: PrintClient) =>
  [client?.city, client?.province]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(",");

const createPseudoBarcode = (value: string) => {
  const seed = value || "0";
  const bars = Array.from(seed.repeat(7)).map((char, index) => {
    const digit = Number(char);
    const width = Number.isFinite(digit) ? (digit % 3) + 1 : 1;
    const margin = index % 4 === 0 ? 2 : 1;
    return `<span style="display:inline-block;width:${width}px;height:58px;margin-right:${margin}px;background:#000"></span>`;
  });

  return bars.join("");
};

export const createEnvelopePrintHtml = (
  ticket: Ticket,
  client?: PrintClient,
) => {
  const isPurchaseTicket =
    ticket.status === "sold" ||
    ticket.status === "sold_expired" ||
    ticket.location.trim().toUpperCase() === "BIWK";
  const ticketNumber = String(ticket.ticket_number ?? "");
  const pawnAmount = Number(ticket.amount ?? 0);
  const oneTimeFee = Number(ticket.onetime_fee ?? 0);
  const interestAmount = calculation.getBaseIntAmt(pawnAmount);
  const earlyClaimAmount = calculation.getEarlyAmt(pawnAmount, oneTimeFee);
  const amountDue = calculation.getBasePickupAmt(pawnAmount, oneTimeFee);
  const transactionDate = ticket.transaction_datetime;
  const earlyClaimDate = addDays(transactionDate, 7);
  const dueDate = ticket.due_date;
  const clientName = formatClientName(client);
  const cityProvince = formatCityProvince(client);
  const barcode = createPseudoBarcode(ticketNumber);
  const topBrandHtml = isPurchaseTicket
    ? ""
    : '<div class="brand">Money Express</div>';
  const moneyFieldsHtml = isPurchaseTicket
    ? `<div class="small-row"><span class="label">Purchase Amt:</span><span class="value">${formatMoney(pawnAmount)}</span></div>`
    : `<div class="small-row"><span class="label">Pawn Amt:</span><span class="value">${formatMoney(pawnAmount)}</span></div>
        <div class="small-row"><span class="label">Interest Amt:</span><span class="value">${formatMoney(interestAmount)}</span></div>
        <div class="small-row"><span class="label">Early Claim Amt:</span><span class="value">${formatMoney(earlyClaimAmount)}</span></div>`;
  const additionalDateFieldsHtml = isPurchaseTicket
    ? ""
    : `<div class="small-row"><span class="label">Due Date:</span><span class="value">${formatTicketDate(dueDate)}</span></div>
        <div class="small-row"><span class="label">Amt Due:</span><span class="value">${formatMoney(amountDue)}</span></div>`;
  const ratesHtml = isPurchaseTicket
    ? ""
    : `<div class="rates">
        <span>InterestRate:</span>
        <span>30%</span>
        <span>Early Redemption Rate:</span>
        <span>10%</span>
      </div>
      <div class="terms" style="top: 4.74in;">Early redemption rates ar subject to a $5 minimum interest amount</div>`;
  const bottomDatesHtml = isPurchaseTicket
    ? `<div class="bottom-date-row">
          <span class="label">Date:</span>
          <span class="value">${formatTicketDate(transactionDate)}</span>
          <span></span>
          <span></span>
        </div>
        <div class="bottom-date-row">
          <span class="label">Amt Paid:</span>
          <span class="value">${formatMoney(pawnAmount)}</span>
          <span></span>
          <span></span>
        </div>`
    : `<div class="bottom-date-row">
          <span class="label">Date:</span>
          <span class="value">${formatTicketDate(transactionDate)}</span>
          <span></span>
          <span></span>
        </div>
        <div class="bottom-date-row">
          <span class="label">Early Claim:</span>
          <span class="value">${formatTicketDate(earlyClaimDate)}</span>
          <span class="label">Amt Due:</span>
          <span class="value">${formatMoney(earlyClaimAmount)}</span>
        </div>
        <div class="bottom-date-row">
          <span class="label">Due Date:</span>
          <span class="value">${formatTicketDate(dueDate)}</span>
          <span class="label">Amt Due:</span>
          <span class="value">${formatMoney(amountDue)}</span>
        </div>`;
  const bottomTermsHtml = isPurchaseTicket
    ? '<div class="purchase-notice">This article has been purchased by Money Express</div>'
    : `<div class="bottom-terms">
        All pawned goods must be held for a minimum of 2 clear business days<br />
        before they may be redeemed.<br />
        We are not responsible for any items lost, damaged or stolen in our store.<br />
        This article must be redeemed or extended within 30 days or it will be sold.
      </div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ticket ${escapeHtml(ticketNumber)}</title>
  <style>
    @page {
      size: 4.1in 8.45in;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: #000;
      background: transparent;
      font-family: "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 4.1in;
      min-height: 8.45in;
      margin: 0 auto;
      padding: 0.14in 0.12in 0.14in 0.07in;
      position: relative;
      overflow: hidden;
    }

    @media print {
      .page {
        margin: 0;
      }
    }

    .top-copy {
      height: 4.86in;
      position: relative;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .customer-copy {
      height: 3.35in;
      position: relative;
      padding-top: 0.48in;
    }

    .brand {
      position: absolute;
      top: 0.02in;
      left: 1.92in;
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 900;
      font-size: 25px;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }

    .logo-dot {
      position: absolute;
      top: 0.15in;
      left: 1.86in;
      width: 0.23in;
      height: 0.23in;
      border-radius: 50%;
      background: #000;
    }

    .barcode {
      height: 0.55in;
      overflow: hidden;
      line-height: 0;
      white-space: nowrap;
    }

    .barcode.top {
      position: absolute;
      top: 0.03in;
      left: 0.08in;
      width: 1.55in;
    }

    .barcode.bottom {
      position: absolute;
      top: 0.18in;
      left: 0.08in;
      width: 1.55in;
    }

    .store-block {
      position: absolute;
      top: 0.16in;
      left: 1.95in;
      width: 1.8in;
      text-align: center;
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 900;
      line-height: 1;
    }

    .store-name {
      font-size: 25px;
      margin-bottom: 0.03in;
    }

    .store-line {
      font-size: 16px;
    }

    .field-row {
      display: grid;
      grid-template-columns: 0.78in 1.44in 0.9in 1fr;
      column-gap: 0.04in;
      align-items: baseline;
      min-height: 0.22in;
      font-size: 18px;
      line-height: 1.02;
      font-weight: 900;
    }

    .field-row.two {
      grid-template-columns: 0.78in 1.4in 0.9in 1fr;
    }

    .field-row .label,
    .small-row .label {
      font-weight: 900;
      white-space: nowrap;
    }

    .field-row .value,
    .small-row .value {
      font-weight: 900;
      overflow-wrap: normal;
    }

    .top-fields {
      position: absolute;
      top: 0.62in;
      left: 0.04in;
      right: 0;
    }

    .client-fields {
      position: absolute;
      top: 1.12in;
      left: 0.04in;
      right: 0;
    }

    .money-fields {
      position: absolute;
      top: 2.34in;
      left: 0.04in;
      width: 3in;
    }

    .money-fields .small-row,
    .date-fields .small-row {
      display: grid;
      grid-template-columns: 1.54in 1fr;
      min-height: 0.23in;
      font-size: 18px;
      line-height: 1.03;
      font-weight: 900;
    }

    .date-fields {
      position: absolute;
      top: 3.02in;
      left: 0.04in;
      width: 3.15in;
    }

    .signature {
      position: absolute;
      top: 3.78in;
      left: 0.04in;
      right: 0.28in;
      font-size: 18px;
      line-height: 1;
      font-weight: 900;
      display: grid;
      grid-template-columns: 0.95in 0.22in 1fr;
      align-items: end;
    }

    .signature-line {
      border-bottom: 2px solid #000;
      height: 0.16in;
    }

    .terms {
      position: absolute;
      left: 0.02in;
      right: 0;
      font-size: 10px;
      line-height: 1.14;
      font-weight: 900;
    }

    .terms.top {
      top: 4.02in;
    }

    .rates {
      position: absolute;
      top: 4.6in;
      left: 0.02in;
      right: 0.35in;
      display: grid;
      grid-template-columns: 1.18in 0.55in 1.45in 0.35in;
      column-gap: 0.06in;
      font-size: 10px;
      line-height: 1;
      font-weight: 900;
    }

    .bottom-fields {
      position: absolute;
      top: 1.28in;
      left: 0.04in;
      right: 0;
    }

    .bottom-dates {
      position: absolute;
      top: 1.92in;
      left: 0.04in;
      right: 0;
    }

    .bottom-date-row {
      display: grid;
      grid-template-columns: 0.95in 1.34in 0.82in 1fr;
      column-gap: 0.04in;
      min-height: 0.22in;
      font-size: 17px;
      line-height: 1.02;
      font-weight: 900;
    }

    .bottom-terms {
      position: absolute;
      left: 0.02in;
      right: 0;
      bottom: 0.05in;
      font-size: 10px;
      line-height: 1.15;
      font-weight: 900;
    }

    .purchase .money-fields {
      top: 2.08in;
      width: 3.2in;
    }

    .purchase .date-fields {
      top: 2.48in;
    }

    .purchase .signature {
      top: 3.78in;
    }

    .purchase .bottom-dates {
      top: 1.96in;
    }

    .purchase-notice {
      position: absolute;
      left: 0.04in;
      right: 0;
      bottom: 0.48in;
      font-size: 17px;
      line-height: 1.08;
      font-weight: 900;
    }
  </style>
</head>
<body>
  <main class="page${isPurchaseTicket ? " purchase" : ""}">
    <section class="top-copy">
      <div class="barcode top">${barcode}</div>
      <div class="logo-dot"></div>
      ${topBrandHtml}

      <div class="top-fields">
        <div class="field-row">
          <span class="label">Ticket #</span>
          <span class="value">${escapeHtml(ticketNumber)}</span>
          <span class="label">Location:</span>
          <span class="value">${escapeHtml(ticket.location)}</span>
        </div>
        <div class="field-row">
          <span class="label">Remark:</span>
          <span class="value" style="grid-column: span 3;">${escapeHtml(ticket.description)}</span>
        </div>
      </div>

      <div class="client-fields">
        <div class="field-row">
          <span class="label">Client #</span>
          <span class="value">${escapeHtml(client?.client_number ?? ticket.client_number)}</span>
          <span class="label">Employee:</span>
          <span class="value">${escapeHtml(ticket.employee_name)}</span>
        </div>
        <div class="field-row">
          <span class="label">Name:</span>
          <span class="value" style="grid-column: span 3;">${escapeHtml(clientName)}</span>
        </div>
        <div class="field-row">
          <span class="label">Address:</span>
          <span class="value" style="grid-column: span 3;">${escapeHtml(client?.address?.toUpperCase() ?? "")}</span>
        </div>
        <div class="field-row">
          <span class="label">City:</span>
          <span class="value" style="grid-column: span 3;">${escapeHtml(cityProvince)}</span>
        </div>
      </div>

      <div class="money-fields">
        ${moneyFieldsHtml}
      </div>

      <div class="date-fields">
        <div class="small-row"><span class="label">Date:</span><span class="value">${formatTicketDate(transactionDate)}</span></div>
        ${additionalDateFieldsHtml}
      </div>

      <div class="signature">
        <span>Signature:</span>
        <span>X</span>
        <span class="signature-line"></span>
      </div>

      <div class="terms top">
        I declare these goods to be free of any encumbrances and are my personal<br />
        belongings. I also understand that the store is not responsible for any item<br />
        lost, damaged or stolen. All pawned goods must be held for a minimum of 2<br />
        clear business days for police checks.
      </div>

      ${ratesHtml}
    </section>

    <section class="customer-copy">
      <div class="barcode bottom">${barcode}</div>
      <div class="store-block">
        <div class="store-name">Money Express</div>
        <div class="store-line">236 20th Street West</div>
        <div class="store-line">Saskatoon, SK</div>
        <div class="store-line">306-665-3232</div>
      </div>

      <div class="bottom-fields">
        <div class="field-row two">
          <span class="label">Ticket #</span>
          <span class="value">${escapeHtml(ticketNumber)}</span>
          <span class="label">Location:</span>
          <span class="value">${escapeHtml(ticket.location)}</span>
        </div>
        <div class="field-row">
          <span class="label">Remark:</span>
          <span class="value" style="grid-column: span 3;">${escapeHtml(ticket.description)}</span>
        </div>
      </div>

      <div class="bottom-dates">
        ${bottomDatesHtml}
      </div>

      ${bottomTermsHtml}
    </section>
  </main>
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 150);
    });
  </script>
</body>
</html>`;
};
