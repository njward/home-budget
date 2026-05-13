import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const event = await request.json();

  console.warn("Plaid Link client event", JSON.stringify(event, null, 2));

  return NextResponse.json({ ok: true });
}
