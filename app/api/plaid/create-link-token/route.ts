import { NextResponse } from "next/server";
import { requireHousehold } from "@/lib/household";
import { plaid, plaidCountryCodes, plaidProducts } from "@/lib/plaid";

export async function POST() {
  const { user } = await requireHousehold();

  const response = await plaid.linkTokenCreate({
    user: {
      client_user_id: user.id
    },
    client_name: "Home Budget",
    products: plaidProducts(),
    country_codes: plaidCountryCodes(),
    language: "en"
  });

  return NextResponse.json({ linkToken: response.data.link_token });
}
