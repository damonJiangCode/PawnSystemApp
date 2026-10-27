const { contextBridge, ipcRenderer } = require("electron");

const CHANNELS = {
  ADD_EMPLOYEE: "add-employee",
  SEARCH_EMPLOYEES: "search-employees",
  UPDATE_EMPLOYEE: "update-employee",
  GET_TICKETS: "get-tickets",
  GET_HOLIDAY_DATES: "get-holiday-dates",
  ADD_HOLIDAY_DATE: "add-holiday-date",
  DELETE_HOLIDAY_DATE: "delete-holiday-date",
  SEARCH_TICKET: "search-ticket",
  SEARCH_PAYMENT_TICKET: "search-payment-ticket",
  LOAD_BUYBACK_REPORT: "load-buyback-report",
  LOAD_DAILY_REPORT: "load-daily-report",
  LOAD_INTEREST_REPORT: "load-interest-report",
  LOAD_OVERDUE_REPORT: "load-overdue-report",
  CHECK_XML_REPORT_CONNECTION: "check-xml-report-connection",
  LOAD_XML_REPORT_PREVIEW: "load-xml-report-preview",
  SUBMIT_XML_REPORT: "submit-xml-report",
  GET_ITEMS: "get-items",
  GET_ITEM_CATEGORIES: "get-item-categories",
  SEARCH_ITEMS: "search-items",
  ADD_ITEM: "add-item",
  UPDATE_ITEM: "update-item",
  DELETE_ITEM: "delete-item",
  LINK_ITEMS_TO_TICKET: "link-items-to-ticket",
  SAVE_ITEM_IMAGE: "save-item-image",
  OPEN_PAYMENT_WINDOW: "open-payment-window",
  NOTIFY_PAYMENT_WINDOW_INPUT_UPDATED: "notify-payment-window-input-updated",
  OPEN_QUOTE_WINDOW: "open-quote-window",
  NOTIFY_QUOTE_WINDOW_INPUT_UPDATED: "notify-quote-window-input-updated",
  OPEN_TICKET_SEARCH_WINDOW: "open-ticket-search-window",
  OPEN_ITEM_SEARCH_WINDOW: "open-item-search-window",
  FOCUS_MAIN_WINDOW: "focus-main-window",
  GET_ITEM_SEARCH_WINDOW_INPUT: "get-item-search-window-input",
  NOTIFY_ITEM_SEARCH_WINDOW_INPUT_UPDATED:
    "notify-item-search-window-input-updated",
  ADD_PAWN_TICKET: "add-pawn-ticket",
  ADD_SELL_TICKET: "add-sell-ticket",
  UPDATE_TICKET: "update-ticket",
  CONVERT_TICKET: "convert-ticket",
  EXPIRE_TICKET: "expire-ticket",
  MARK_TICKET_STOLEN: "mark-ticket-stolen",
  PICKUP_TICKETS: "pickup-tickets",
  EXTEND_TICKETS: "extend-tickets",
  GET_TRANSFER_TICKET_PREVIEW: "get-transfer-ticket-preview",
  TRANSFER_TICKET: "transfer-ticket",
  REVERSE_TICKET: "reverse-ticket",
};

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

const ticketApi = {
  loadTicketsByClient: (clientNumber) =>
    invoke(CHANNELS.GET_TICKETS, clientNumber),
  loadHolidayDates: () => invoke(CHANNELS.GET_HOLIDAY_DATES),
  addHolidayDate: (input) => invoke(CHANNELS.ADD_HOLIDAY_DATE, input),
  deleteHolidayDate: (holidayDate) =>
    invoke(CHANNELS.DELETE_HOLIDAY_DATE, holidayDate),
  searchTicketByNumber: (ticketNumber) =>
    invoke(CHANNELS.SEARCH_TICKET, ticketNumber),
  searchPaymentTicketByNumber: (ticketNumber) =>
    invoke(CHANNELS.SEARCH_PAYMENT_TICKET, ticketNumber),
  loadBuybackReport: (input) => invoke(CHANNELS.LOAD_BUYBACK_REPORT, input),
  loadDailyReport: (input) => invoke(CHANNELS.LOAD_DAILY_REPORT, input),
  loadInterestReport: (input) => invoke(CHANNELS.LOAD_INTEREST_REPORT, input),
  loadOverdueReport: (input) => invoke(CHANNELS.LOAD_OVERDUE_REPORT, input),
  createPawnTicket: (payload) => invoke(CHANNELS.ADD_PAWN_TICKET, payload),
  createSellTicket: (payload) => invoke(CHANNELS.ADD_SELL_TICKET, payload),
  updateTicket: (payload) => invoke(CHANNELS.UPDATE_TICKET, payload),
  convertTicket: (payload) => invoke(CHANNELS.CONVERT_TICKET, payload),
  expireTicket: (payload) => invoke(CHANNELS.EXPIRE_TICKET, payload),
  markTicketStolen: (payload) => invoke(CHANNELS.MARK_TICKET_STOLEN, payload),
  pickupTickets: (payload) => invoke(CHANNELS.PICKUP_TICKETS, payload),
  extendTickets: (payload) => invoke(CHANNELS.EXTEND_TICKETS, payload),
  loadTransferTicketPreview: (ticketNumber) =>
    invoke(CHANNELS.GET_TRANSFER_TICKET_PREVIEW, ticketNumber),
  transferTicket: (payload) => invoke(CHANNELS.TRANSFER_TICKET, payload),
  reverseTicket: (payload) => invoke(CHANNELS.REVERSE_TICKET, payload),
};

const employeeApi = {
  createEmployee: (payload) => invoke(CHANNELS.ADD_EMPLOYEE, payload),
  searchEmployees: (payload) => invoke(CHANNELS.SEARCH_EMPLOYEES, payload),
  updateEmployee: (employeeNumber, payload) =>
    invoke(CHANNELS.UPDATE_EMPLOYEE, employeeNumber, payload),
};

const itemApi = {
  loadItemsByTicket: (ticketNumber) => invoke(CHANNELS.GET_ITEMS, ticketNumber),
  loadItemCategories: () => invoke(CHANNELS.GET_ITEM_CATEGORIES),
  searchItems: (payload) => invoke(CHANNELS.SEARCH_ITEMS, payload),
  createItem: (payload) => invoke(CHANNELS.ADD_ITEM, payload),
  updateItem: (payload) => invoke(CHANNELS.UPDATE_ITEM, payload),
  deleteItem: (ticketNumber, itemNumber) =>
    invoke(CHANNELS.DELETE_ITEM, ticketNumber, itemNumber),
  linkItemsToTicket: (ticketNumber, itemNumbers) =>
    invoke(CHANNELS.LINK_ITEMS_TO_TICKET, ticketNumber, itemNumbers),
  saveItemImage: (fileName, base64) =>
    invoke(CHANNELS.SAVE_ITEM_IMAGE, fileName, base64),
};

const xmlReportApi = {
  checkConnection: () => invoke(CHANNELS.CHECK_XML_REPORT_CONNECTION),
  loadPreview: (input) => invoke(CHANNELS.LOAD_XML_REPORT_PREVIEW, input),
  submitReport: (input) => invoke(CHANNELS.SUBMIT_XML_REPORT, input),
};

const windowApi = {
  openPaymentWindow: (payload) => invoke(CHANNELS.OPEN_PAYMENT_WINDOW, payload),
  onPaymentWindowInputUpdated: (callback) => {
    const listener = (_event, input) => callback(input);
    ipcRenderer.on(CHANNELS.NOTIFY_PAYMENT_WINDOW_INPUT_UPDATED, listener);
    return () =>
      ipcRenderer.removeListener(
        CHANNELS.NOTIFY_PAYMENT_WINDOW_INPUT_UPDATED,
        listener,
      );
  },
  openQuoteWindow: (input) => invoke(CHANNELS.OPEN_QUOTE_WINDOW, input),
  onQuoteWindowInputUpdated: (callback) => {
    const listener = (_event, input) => callback(input);
    ipcRenderer.on(CHANNELS.NOTIFY_QUOTE_WINDOW_INPUT_UPDATED, listener);
    return () =>
      ipcRenderer.removeListener(
        CHANNELS.NOTIFY_QUOTE_WINDOW_INPUT_UPDATED,
        listener,
      );
  },
  openTicketSearchWindow: () => invoke(CHANNELS.OPEN_TICKET_SEARCH_WINDOW),
  openItemSearchWindow: (input) =>
    invoke(CHANNELS.OPEN_ITEM_SEARCH_WINDOW, input),
  focusMainWindow: () => invoke(CHANNELS.FOCUS_MAIN_WINDOW),
  getItemSearchWindowInput: () => invoke(CHANNELS.GET_ITEM_SEARCH_WINDOW_INPUT),
  onItemSearchWindowInputUpdated: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(CHANNELS.NOTIFY_ITEM_SEARCH_WINDOW_INPUT_UPDATED, listener);
    return () =>
      ipcRenderer.removeListener(
        CHANNELS.NOTIFY_ITEM_SEARCH_WINDOW_INPUT_UPDATED,
        listener,
      );
  },
};

contextBridge.exposeInMainWorld("appAPI", {
  employee: employeeApi,
  ticket: ticketApi,
  item: itemApi,
  window: windowApi,
  xmlReport: xmlReportApi,
});

console.log("Preload (CJS) loaded");
