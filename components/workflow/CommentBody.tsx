"use client";

import { Fragment } from "react";

// Minimal comment renderer — supports a deliberate subset of Markdown plus
// @mention highlighting. Not using a library because the surface is tiny and
// every additional dep is a future supply-chain concern. Reorder is
// intentional: inline code first (so backticks protect their contents from
// being re-matched by other rules), then bold, italic, links, then mentions.

const MENTION_TOKENS = new Set([
  "FORD_PRO", "FORDPRO", "FORD-PRO",
  "AUDIENCE", "STRATEGY", "CREATIVE",
  "DEV_OPS", "DEVOPS", "DEV-OPS",
  "TECH_DEV", "TECHDEV", "TECH-DEV",
  "HERE", "EVERYONE", "CHANNEL",
]);

type Node = string | { type: "code" | "bold" | "italic" | "link" | "mention"; value: string; href?: string };

function tokenize(text: string): Node[] {
  // Inline code
  const out: Node[] = [];
  const codeRe = /`([^`\n]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ type: "code", value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));

  // Run remaining text segments through bold → italic → links → mentions.
  return out.flatMap((seg) => (typeof seg === "string" ? expandText(seg) : [seg]));
}

function expandText(seg: string): Node[] {
  // Bold **x**
  let parts: Node[] = [seg];
  parts = applyRegex(parts, /\*\*([^*\n]+)\*\*/g, (m) => ({ type: "bold", value: m[1] }));
  // Italic *x* (must come after bold to not interfere)
  parts = applyRegex(parts, /(^|[^*])\*([^*\n]+)\*(?!\*)/g, (m) => [m[1], { type: "italic", value: m[2] } as Node]);
  // Markdown links [text](url)
  parts = applyRegex(parts, /\[([^\]]+)\]\(([^)\s]+)\)/g, (m) => ({ type: "link", value: m[1], href: m[2] }));
  // Bare URLs
  parts = applyRegex(parts, /(https?:\/\/[^\s)]+)/g, (m) => ({ type: "link", value: m[1], href: m[1] }));
  // Mentions @TOKEN
  parts = applyRegex(parts, /@([A-Za-z][A-Za-z0-9_-]*)/g, (m) => {
    const upper = m[1].toUpperCase();
    if (!MENTION_TOKENS.has(upper)) return `@${m[1]}`;
    return { type: "mention", value: `@${m[1]}` };
  });
  return parts;
}

function applyRegex(
  input: Node[],
  re: RegExp,
  replace: (m: RegExpExecArray) => Node | Node[],
): Node[] {
  const out: Node[] = [];
  for (const item of input) {
    if (typeof item !== "string") {
      out.push(item);
      continue;
    }
    let last = 0;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(item)) !== null) {
      if (m.index > last) out.push(item.slice(last, m.index));
      const r = replace(m);
      if (Array.isArray(r)) out.push(...r);
      else out.push(r);
      last = m.index + m[0].length;
    }
    if (last < item.length) out.push(item.slice(last));
  }
  return out;
}

export function CommentBody({ body }: { body: string }) {
  // Preserve paragraph breaks (blank line = new paragraph).
  const paragraphs = body.split(/\n{2,}/);
  return (
    <div className="space-y-2 whitespace-pre-wrap">
      {paragraphs.map((p, i) => {
        const nodes = tokenize(p);
        return (
          <p key={i}>
            {nodes.map((n, j) => {
              if (typeof n === "string") return <Fragment key={j}>{n}</Fragment>;
              switch (n.type) {
                case "code":
                  return <code key={j} className="bg-muted px-1 py-0.5 rounded text-[0.85em]">{n.value}</code>;
                case "bold":
                  return <strong key={j}>{n.value}</strong>;
                case "italic":
                  return <em key={j}>{n.value}</em>;
                case "link":
                  return (
                    <a
                      key={j}
                      href={n.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:no-underline"
                    >
                      {n.value}
                    </a>
                  );
                case "mention":
                  return (
                    <span
                      key={j}
                      className="bg-pink-500/15 text-pink-700 dark:text-pink-300 px-1 rounded font-medium"
                    >
                      {n.value}
                    </span>
                  );
              }
            })}
          </p>
        );
      })}
    </div>
  );
}
