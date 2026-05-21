import { NextRequest, NextResponse } from "next/server";
import { setSession, clearSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { passcode, action } = await request.json();

  if (action === "logout") {
    await clearSession();
    return NextResponse.json({ ok: true });
  }

  if (passcode === process.env.PASSCODE) {
    await setSession();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Incorrect passcode" }, { status: 401 });
}
