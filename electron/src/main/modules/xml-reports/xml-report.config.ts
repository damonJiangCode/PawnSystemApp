import { loadEnv } from "../../config/env.ts";
import type {
  XmlReportEnvironment,
  XmlReportLogin,
} from "./xml-report.types.ts";

const WSDL_URLS: Record<XmlReportEnvironment, string> = {
  sandbox: "https://w3apisandbox.leadsonline.com/ticketWS.asmx?wsdl",
  production: "https://w3api.leadsonline.ca/ticketWS.asmx?wsdl",
};

export type XmlReportConfig = {
  environment: XmlReportEnvironment;
  wsdlUrl: string;
  login: XmlReportLogin;
};

export const loadXmlReportConfig = (): XmlReportConfig => {
  loadEnv();

  const environment =
    process.env.LEADSONLINE_ENV === "production" ? "production" : "sandbox";
  const storeId = Number(process.env.LEADSONLINE_STORE_ID);
  const userName = process.env.LEADSONLINE_USERNAME?.trim() ?? "";
  const password = process.env.LEADSONLINE_PASSWORD ?? "";

  if (!Number.isInteger(storeId) || storeId <= 0 || !userName || !password) {
    throw new Error(
      "LeadsOnline API configuration is incomplete. Check the LEADSONLINE_* environment variables.",
    );
  }

  return {
    environment,
    wsdlUrl: WSDL_URLS[environment],
    login: { storeId, userName, password },
  };
};
