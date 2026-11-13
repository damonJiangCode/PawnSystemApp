import { Injectable } from '@nestjs/common';
import * as soap from 'soap';
import { LeadsOnlineConfig } from './leadsonline.config.js';
import type {
  LeadsOnlineResult,
  LeadsOnlineTicket,
} from './xml-report.types.js';

// How long to wait for LeadsOnline before giving up on one request.
const REQUEST_TIMEOUT_MS = 30_000;

// LeadsOnline answers every call with { errorCode, errorResponse }.
type SoapAnswer = { errorCode?: number | string; errorResponse?: string };

// Talks to LeadsOnline's SOAP web service. SOAP is XML over HTTP: the WSDL
// describes the operations, and the soap library builds a client from it so
// we can call CheckLoginAsync / SubmitTransactionAsync like normal functions.
@Injectable()
export class LeadsOnlineClient {
  private client?: Promise<soap.Client>;

  constructor(private readonly config: LeadsOnlineConfig) {}

  // Is the login accepted? Network failures count as "not connected".
  async checkLogin(): Promise<LeadsOnlineResult> {
    const login = this.config.login();
    try {
      const answer = await this.call('CheckLogin', { login });
      return this.toResult(answer, 'Connected to LeadsOnline successfully.');
    } catch (error) {
      return this.unreachable(error);
    }
  }

  // Send one ticket. Network failures come back as a failed result.
  async submitTicket(ticket: LeadsOnlineTicket): Promise<LeadsOnlineResult> {
    const login = this.config.login();
    try {
      const answer = await this.call('SubmitTransaction', { login, ticket });
      return this.toResult(answer, 'Submitted successfully.');
    } catch (error) {
      return this.unreachable(error);
    }
  }

  // Calls e.g. client.CheckLoginAsync(args) and reads CheckLoginResult.
  private async call(
    operation: 'CheckLogin' | 'SubmitTransaction',
    args: object,
  ): Promise<SoapAnswer> {
    const client = await this.getClient();
    const [body] = (await client[`${operation}Async`](args, {
      timeout: REQUEST_TIMEOUT_MS,
    })) as [Record<string, SoapAnswer> | null];
    return body?.[`${operation}Result`] ?? {};
  }

  // Downloading the WSDL is slow, so build the client once and reuse it.
  // If it fails (e.g. offline), forget it so the next call tries again.
  private getClient(): Promise<soap.Client> {
    this.client ??= soap
      .createClientAsync(this.config.wsdlUrl, {
        wsdl_options: { timeout: REQUEST_TIMEOUT_MS },
      })
      .catch((error: unknown) => {
        this.client = undefined;
        throw error;
      });
    return this.client;
  }

  private toResult(answer: SoapAnswer, okMessage: string): LeadsOnlineResult {
    const errorCode = Number(answer.errorCode ?? -1);
    return {
      success: errorCode === 0,
      error_code: errorCode,
      message:
        errorCode === 0
          ? okMessage
          : answer.errorResponse || 'LeadsOnline rejected the request.',
    };
  }

  private unreachable(error: unknown): LeadsOnlineResult {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    return {
      success: false,
      error_code: -1,
      message: `Unable to reach LeadsOnline.${detail}`,
    };
  }
}
