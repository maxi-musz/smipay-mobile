/**
 * Provider configuration for utility services (airtime, data, etc.).
 * Reads from env; defaults to vtpass when unset.
 */

export type AirtimeProvider = "vtpass" | "sagecloud" | "fidelity_bank";

const VALID_AIRTIME_PROVIDERS: AirtimeProvider[] = [
  "vtpass",
  "sagecloud",
  "fidelity_bank",
];

function parseAirtimeProvider(): AirtimeProvider {
  const raw =
    process.env.EXPO_PUBLIC_AIRTIME_PROVIDER?.toLowerCase().trim() ?? "vtpass";
  if (VALID_AIRTIME_PROVIDERS.includes(raw as AirtimeProvider)) {
    return raw as AirtimeProvider;
  }
  return "vtpass";
}

let _airtimeProvider: AirtimeProvider | undefined;

export function getAirtimeProvider(): AirtimeProvider {
  if (_airtimeProvider === undefined) {
    _airtimeProvider = parseAirtimeProvider();
  }
  return _airtimeProvider;
}

export function getAirtimeRoute(): `/(app)/${AirtimeProvider}/airtime` {
  const provider = getAirtimeProvider();
  return `/(app)/${provider}/airtime` as const;
}

export type DataProvider = "vtpass";

const VALID_DATA_PROVIDERS: DataProvider[] = ["vtpass"];

function parseDataProvider(): DataProvider {
  const raw =
    process.env.EXPO_PUBLIC_DATA_PROVIDER?.toLowerCase().trim() ?? "vtpass";
  if (VALID_DATA_PROVIDERS.includes(raw as DataProvider)) {
    return raw as DataProvider;
  }
  return "vtpass";
}

let _dataProvider: DataProvider | undefined;

export function getDataProvider(): DataProvider {
  if (_dataProvider === undefined) {
    _dataProvider = parseDataProvider();
  }
  return _dataProvider;
}

export function getDataRoute(): `/(app)/${DataProvider}/data` {
  const provider = getDataProvider();
  return `/(app)/${provider}/data` as const;
}
