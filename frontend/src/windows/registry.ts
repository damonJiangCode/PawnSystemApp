import { lazy, type ComponentType } from "react";

const EmployeeAdminWindow = lazy(
  () => import("./employees/EmployeeAdminWindow"),
);
const EyeColorReferenceWindow = lazy(
  () => import("./reference/EyeColorReferenceWindow"),
);
const HairColorReferenceWindow = lazy(
  () => import("./reference/HairColorReferenceWindow"),
);
const IdTypeReferenceWindow = lazy(
  () => import("./reference/IdTypeReferenceWindow"),
);
const ItemCategoryReferenceWindow = lazy(
  () => import("./reference/ItemCategoryReferenceWindow"),
);
const HolidayReferenceWindow = lazy(
  () => import("./reference/HolidayReferenceWindow"),
);
const LocationReferenceWindow = lazy(
  () => import("./reference/LocationReferenceWindow"),
);
const ItemSearchWindow = lazy(() => import("./item-search/ItemSearchWindow"));
const BuybackReportWindow = lazy(() => import("./reports/BuybackReportWindow"));
const DailyReportWindow = lazy(() => import("./reports/DailyReportWindow"));
const InterestReportWindow = lazy(
  () => import("./reports/InterestReportWindow"),
);
const OverdueReportWindow = lazy(() => import("./reports/OverdueReportWindow"));
const XmlReportWindow = lazy(() => import("./reports/XmlReportWindow"));
const TicketExpireWindow = lazy(() => import("./tickets/TicketExpireWindow"));
const TicketSearchWindow = lazy(() => import("./tickets/TicketSearchWindow"));
const TicketStolenWindow = lazy(() => import("./tickets/TicketStolenWindow"));
const PaymentWindow = lazy(() => import("./payment/PaymentWindow"));
const QuoteWindow = lazy(() => import("./quote/QuoteWindow"));

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
  "reference-id-types": IdTypeReferenceWindow,
  "reference-item-categories": ItemCategoryReferenceWindow,
  "reference-location": LocationReferenceWindow,
};
