import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as soap from 'soap';
import { LeadsOnlineClient } from './leadsonline.client.js';
import { LeadsOnlineConfig } from './leadsonline.config.js';
import type { LeadsOnlineTicket } from './xml-report.types.js';

vi.mock('soap', () => ({ createClientAsync: vi.fn() }));
const createClientAsync = vi.mocked(soap.createClientAsync);

const SETTINGS = {
  LEADSONLINE_STORE_ID: '123',
  LEADSONLINE_USERNAME: ' shop ',
  LEADSONLINE_PASSWORD: 'secret',
};
const LOGIN = { storeId: 123, userName: 'shop', password: 'secret' };

const makeConfig = (settings: Record<string, string> = SETTINGS) =>
  new LeadsOnlineConfig(new ConfigService(settings));

// A fake soap client whose operations resolve with the given answer body.
const fakeSoapClient = (body: unknown) => {
  const client = {
    CheckLoginAsync: vi.fn().mockResolvedValue([body]),
    SubmitTransactionAsync: vi.fn().mockResolvedValue([body]),
  };
  createClientAsync.mockResolvedValue(client as unknown as soap.Client);
  return client;
};

describe('LeadsOnlineConfig', () => {
  it('uses the sandbox unless production is set', () => {
    expect(makeConfig().environment).toBe('sandbox');
    expect(makeConfig().wsdlUrl).toContain('w3apisandbox.leadsonline.com');

    const production = makeConfig({
      ...SETTINGS,
      LEADSONLINE_ENV: ' Production ',
    });
    expect(production.environment).toBe('production');
    expect(production.wsdlUrl).toContain('w3api.leadsonline.ca');
  });

  it('refuses an unknown environment instead of guessing', () => {
    expect(() => makeConfig({ ...SETTINGS, LEADSONLINE_ENV: 'prod' })).toThrow(
      'LEADSONLINE_ENV must be "sandbox" or "production", got "prod".',
    );
  });

  it('returns the trimmed login', () => {
    expect(makeConfig().login()).toEqual(LOGIN);
  });

  it('answers 503 when credentials are missing', () => {
    const config = makeConfig({ ...SETTINGS, LEADSONLINE_PASSWORD: '' });
    expect(() => config.login()).toThrow(ServiceUnavailableException);
    expect(makeConfig({}).environment).toBe('sandbox');
  });
});

describe('LeadsOnlineClient', () => {
  beforeEach(() => {
    createClientAsync.mockReset();
  });

  it('checks the login and reads CheckLoginResult', async () => {
    const soapClient = fakeSoapClient({
      CheckLoginResult: { errorCode: '0' },
    });

    const result = await new LeadsOnlineClient(makeConfig()).checkLogin();

    expect(result).toEqual({
      success: true,
      error_code: 0,
      message: 'Connected to LeadsOnline successfully.',
    });
    expect(soapClient.CheckLoginAsync).toHaveBeenCalledWith(
      { login: LOGIN },
      { timeout: 30_000 },
    );
  });

  it('passes on the LeadsOnline error message', async () => {
    fakeSoapClient({
      SubmitTransactionResult: { errorCode: 7, errorResponse: 'Bad ticket' },
    });
    const ticket = { key: { ticketnumber: '1' } } as LeadsOnlineTicket;

    const result = await new LeadsOnlineClient(makeConfig()).submitTicket(
      ticket,
    );

    expect(result).toEqual({
      success: false,
      error_code: 7,
      message: 'Bad ticket',
    });
  });

  it('builds the soap client once and reuses it', async () => {
    fakeSoapClient({ CheckLoginResult: { errorCode: 0 } });
    const client = new LeadsOnlineClient(makeConfig());

    await client.checkLogin();
    await client.checkLogin();

    expect(createClientAsync).toHaveBeenCalledTimes(1);
  });

  it('reports an unreachable service and retries the WSDL next time', async () => {
    createClientAsync.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));
    const client = new LeadsOnlineClient(makeConfig());

    expect(await client.checkLogin()).toEqual({
      success: false,
      error_code: -1,
      message: 'Unable to reach LeadsOnline. getaddrinfo ENOTFOUND',
    });

    fakeSoapClient({ CheckLoginResult: { errorCode: 0 } });
    expect((await client.checkLogin()).success).toBe(true);
    expect(createClientAsync).toHaveBeenCalledTimes(2);
  });

  it('does not call LeadsOnline without credentials', async () => {
    const client = new LeadsOnlineClient(makeConfig({}));

    await expect(client.checkLogin()).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(createClientAsync).not.toHaveBeenCalled();
  });
});
