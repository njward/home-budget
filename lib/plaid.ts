import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

const env = process.env.PLAID_ENV ?? "sandbox";

export const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[env as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET
      }
    }
  })
);

export function plaidProducts() {
  return (process.env.PLAID_PRODUCTS ?? "transactions")
    .split(",")
    .map((product) => product.trim() as Products);
}

export function plaidCountryCodes() {
  return (process.env.PLAID_COUNTRY_CODES ?? "US")
    .split(",")
    .map((code) => code.trim() as CountryCode);
}
