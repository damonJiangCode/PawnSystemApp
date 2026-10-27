import { lazy, type ComponentType } from "react";

const EmployeeAdminWindow = lazy(
  () => import("../modules/employees/admin/EmployeeAdminWindow"),
);
const EyeColorReferenceWindow = lazy(
  () => import("../modules/reference/colors/eye-color/EyeColorReferenceWindow"),
);
const HairColorReferenceWindow = lazy(
  () =>
    import("../modules/reference/colors/hair-color/HairColorReferenceWindow"),
);
const HolidayReferenceWindow = lazy(
  () => import("../modules/reference/holiday/HolidayReferenceWindow"),
);
const LocationReferenceWindow = lazy(
  () => import("../modules/reference/location/LocationReferenceWindow"),
);
const ItemSearchWindow = lazy(
  () =>
    import("../modules/items/menu-actions/item-search-window/ItemSearchWindow"),
);
const BuybackReportWindow = lazy(
  () => import("../modules/reports/menu-actions/BuybackReportWindow"),
);
const DailyReportWindow = lazy(
  () => import("../modules/reports/menu-actions/DailyReportWindow"),
);
const InterestReportWindow = lazy(
  () => import("../modules/reports/menu-actions/InterestReportWindow"),
);
const OverdueReportWindow = lazy(
  () => import("../modules/reports/menu-actions/OverdueReportWindow"),
);
const XmlReportWindow = lazy(
  () => import("../modules/reports/menu-actions/XmlReportWindow"),
);
const TicketExpireWindow = lazy(
  () => import("../modules/tickets/menu-actions/TicketExpireWindow"),
);
const TicketSearchWindow = lazy(
  () => import("../modules/tickets/menu-actions/TicketSearchWindow"),
);
const TicketStolenWindow = lazy(
  () => import("../modules/tickets/menu-actions/TicketStolenWindow"),
);
const PaymentWindow = lazy(
  () => import("../modules/tickets/payment/PaymentWindow"),
);
const QuoteWindow = lazy(() => import("../modules/tickets/quote/QuoteWindow"));

export type WindowScreenProps = {
  screen: string;
};

export const windowRegistry: Record<
  string,
  ComponentType<WindowScreenProps>
> = {
  payment: PaymentWindow,
  quote: QuoteWindow,
  "ticket-search": TicketSearchWindow,
  "ticket-expire": TicketExpireWindow,
  "ticket-stolen": TicketStolenWindow,
  "item-search": ItemSearchWindow,
  "report-daily": DailyReportWindow,
  "report-buyback": BuybackReportWindow,
  "report-interest": InterestReportWindow,
  "report-overdue": OverdueReportWindow,
  "report-xml": XmlReportWindow,
  "admin-employee": EmployeeAdminWindow,
  "reference-hair-color": HairColorReferenceWindow,
  "reference-eye-color": EyeColorReferenceWindow,
  "reference-holiday": HolidayReferenceWindow,
  "reference-location": LocationReferenceWindow,
};
