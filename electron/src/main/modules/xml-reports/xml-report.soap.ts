import * as soap from "soap";
import { loadXmlReportConfig } from "./xml-report.config.ts";
import type { LeadsOnlineTicket } from "./xml-report.types.ts";

type SoapResponse = {
  errorCode?: number | string;
  errorResponse?: string;
};

const readResponse = (
  result: Record<string, SoapResponse>,
  responseKey: string,
): SoapResponse => result[responseKey] ?? {};

let clientPromise: Promise<soap.Client> | undefined;

const getClient = (wsdlUrl: string) => {
  clientPromise ??= soap.createClientAsync(wsdlUrl);
  return clientPromise;
};

const normalizeResponse = (
  result: Record<string, SoapResponse>,
  responseKey: string,
) => {
  const response = readResponse(result, responseKey);
  const errorCode = Number(response.errorCode ?? -1);
  return {
    success: errorCode === 0,
    error_code: errorCode,
    message:
      errorCode === 0
        ? "Submitted successfully."
        : response.errorResponse || "LeadsOnline rejected the transaction.",
  };
};

export const xmlReportSoap = {
  checkLogin: async () => {
    const config = loadXmlReportConfig();
    const client = await getClient(config.wsdlUrl);
    const [result] = (await client.CheckLoginAsync({
      login: config.login,
    })) as [Record<string, SoapResponse>];
    const response = readResponse(result, "CheckLoginResult");
    const errorCode = Number(response.errorCode ?? -1);

    return {
      environment: config.environment,
      connected: errorCode === 0,
      error_code: errorCode,
      message:
        errorCode === 0
          ? "Connected to LeadsOnline successfully."
          : response.errorResponse || "LeadsOnline rejected the login.",
    };
  },

  submitTransaction: async (ticket: LeadsOnlineTicket) => {
    const config = loadXmlReportConfig();
    const client = await getClient(config.wsdlUrl);
    const [result] = (await client.SubmitTransactionAsync({
      login: config.login,
      ticket,
    })) as [Record<string, SoapResponse>];

    return normalizeResponse(result, "SubmitTransactionResult");
  },
};
