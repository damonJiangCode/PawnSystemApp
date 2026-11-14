import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  LeadsOnlineEnvironment,
  LeadsOnlineLogin,
} from './xml-report.types.js';

const WSDL_URLS: Record<LeadsOnlineEnvironment, string> = {
  sandbox: 'https://w3apisandbox.leadsonline.com/ticketWS.asmx?wsdl',
  production: 'https://w3api.leadsonline.ca/ticketWS.asmx?wsdl',
};

// Empty means sandbox. Any other unknown value stops the server, so a typo can
// never send real tickets to the sandbox, or test tickets to production.
const parseEnvironment = (value?: string): LeadsOnlineEnvironment => {
  const environment = value?.trim().toLowerCase() || 'sandbox';
  if (environment !== 'sandbox' && environment !== 'production') {
    throw new Error(
      `LEADSONLINE_ENV must be "sandbox" or "production", got "${value}".`,
    );
  }
  return environment;
};

// LeadsOnline settings from the server's .env. Missing credentials do not stop
// the server from starting: only the calls that talk to LeadsOnline fail, with 503.
@Injectable()
export class LeadsOnlineConfig {
  readonly environment: LeadsOnlineEnvironment;
  readonly wsdlUrl: string;
  private readonly credentials: LeadsOnlineLogin | null;

  constructor(config: ConfigService) {
    this.environment = parseEnvironment(config.get<string>('LEADSONLINE_ENV'));
    this.wsdlUrl = WSDL_URLS[this.environment];

    const storeId = Number(config.get<string>('LEADSONLINE_STORE_ID'));
    const userName = config.get<string>('LEADSONLINE_USERNAME')?.trim() ?? '';
    const password = config.get<string>('LEADSONLINE_PASSWORD') ?? '';
    this.credentials =
      Number.isInteger(storeId) && storeId > 0 && userName && password
        ? { storeId, userName, password }
        : null;
  }

  login(): LeadsOnlineLogin {
    if (!this.credentials) {
      throw new ServiceUnavailableException(
        'LeadsOnline is not set up on the server. Check the LEADSONLINE_* settings.',
      );
    }
    return this.credentials;
  }
}
