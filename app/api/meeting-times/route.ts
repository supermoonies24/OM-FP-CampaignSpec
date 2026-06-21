import { NextRequest, NextResponse } from "next/server";
import { suggestMeetingTimes, type SuggestMeetingTimesInput } from "@/lib/ai/meetingSuggester";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as SuggestMeetingTimesInput;
  if (!Array.isArray(body.attendees) || body.attendees.length === 0) {
    return NextResponse.json({ error: "attendees array is required" }, { status: 400 });
  }
  const result = await suggestMeetingTimes(body);
  return NextResponse.json(result);
}
