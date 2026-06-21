// Minimal RFC 5545 iCalendar serializer. No external dep. Folds long lines
// at 75 octets per spec (approximated to 73 chars to leave headroom for the
// CRLF + leading space on continuation lines).
//
// Each VEVENT is currently an all-day event (DTSTART;VALUE=DATE), which is
// what we want for stage target dates.

export interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  /** Local date or full datetime. For all-day events, pass yyyymmdd. */
  startDate: string; // yyyymmdd or yyyymmddThhmmssZ
  /** All-day end date is exclusive per RFC; for a 1-day event, pass next day's yyyymmdd. */
  endDate?: string;
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
  url?: string;
}

function escape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function fold(line: string): string {
  if (line.length <= 73) return line;
  const out: string[] = [];
  let rest = line;
  out.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 0) {
    out.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  return out.join("\r\n");
}

export function toIcs(
  events: readonly IcsEvent[],
  meta: { calendarName: string; prodId?: string },
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//OneMagnify//${meta.prodId ?? "Ford Pro CRM Workflow"}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(meta.calendarName)}`,
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${nowDateTimeUtc()}`);
    if (e.startDate.includes("T")) {
      lines.push(`DTSTART:${e.startDate}`);
      if (e.endDate) lines.push(`DTEND:${e.endDate}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${e.startDate}`);
      if (e.endDate) lines.push(`DTEND;VALUE=DATE:${e.endDate}`);
    }
    lines.push(`SUMMARY:${escape(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${escape(e.description)}`);
    if (e.url) lines.push(`URL:${escape(e.url)}`);
    if (e.status) lines.push(`STATUS:${e.status}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function dateOnlyUtc(d: Date): string {
  const y = d.getUTCFullYear().toString().padStart(4, "0");
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}${m}${day}`;
}

export function addDaysUtc(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function nowDateTimeUtc(): string {
  const d = new Date();
  const y = d.getUTCFullYear().toString().padStart(4, "0");
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  const ss = d.getUTCSeconds().toString().padStart(2, "0");
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}
