import React from "react";
import { Check } from "lucide-react";

/**
 * Utility to parse standard markdown-like links [Link Text](URL),
 * inline section titles (Taste & Aroma, Why Choose, How to Use, etc.),
 * bullet points (•, ✓, ✔, *, -), and paragraphs into a clean, well-formatted React layout.
 */
export function parseAndRenderSeoLinks(rawText: string): React.ReactNode {
  if (!rawText) return "";

  let formatted = rawText;

  // Insert newlines before true main section titles if squished into one line
  const headers = [
    "About This Product",
    "About Our",
    "Why Choose This Product",
    "Why Choose",
    "Taste & Aroma",
    "Taste and Aroma",
    "How to Use",
    "Suggested Use",
    "Directions",
    "Highlighted Key Formula Benefits",
    "Key Benefits",
  ];

  headers.forEach((h) => {
    const re = new RegExp(`(?<!^|\\n)(${h})`, "gi");
    formatted = formatted.replace(re, "\n\n$1\n");
  });

  // Insert newlines before inline bullet markers (•, ✓, ✔, ➢, ▶) if not preceded by a newline
  formatted = formatted.replace(/(?<!\n)([•✓✔➢▶])\s*/g, "\n$1 ");

  // Split into raw lines and trim each
  const rawLines = formatted.split("\n").map((l) => l.trim());

  const elements: React.ReactNode[] = [];

  rawLines.forEach((rawLine, idx) => {
    if (!rawLine) return;

    // Check if line starts with a bullet marker
    const isBullet = /^[•✓✔➢▶\-\*]\s*/.test(rawLine);
    // Strip all leading bullet symbols (including •, ✓, ✔, -, *) and markdown header hashes (#)
    let cleanLine = rawLine.replace(/^[•✓✔➢▶\-\*#]+\s*/g, "").replace(/\uFFFD/g, "'").replace(/\|/g, "").trim();

    // If cleanLine is empty after stripping bullet markers, ignore it
    if (!cleanLine || cleanLine === "•" || cleanLine === "-" || cleanLine === "*" || /^[-*•\s\._]+$/.test(cleanLine)) return;

    // Check if raw line started with markdown heading (e.g. ## Title)
    const isMarkdownHeader = /^#+\s+/.test(rawLine);

    // Check if cleanLine is explicitly one of the known main section headers
    const isKnownHeader = headers.some(
      (h) => cleanLine.toLowerCase() === h.toLowerCase() || cleanLine.toLowerCase().startsWith(h.toLowerCase() + ":")
    );

    // Strict header check: must be markdown header, known main section header OR short title ending with ':'
    const isHeader =
      !isBullet &&
      (isMarkdownHeader ||
        isKnownHeader ||
        (cleanLine.endsWith(":") && cleanLine.length < 50));

    if (isBullet) {
      elements.push(
        <div
          key={idx}
          className="flex items-start gap-2.5 my-1.5 pl-1 text-xs sm:text-sm text-[#5b6b55]"
        >
          <Check className="w-4 h-4 text-[#3b142e] shrink-0 mt-0.5" />
          <span>{renderLinksInText(cleanLine, idx)}</span>
        </div>
      );
    } else if (isHeader) {
      elements.push(
        <h4
          key={idx}
          className="font-serif font-bold text-sm sm:text-base text-[#2c3527] mt-5 mb-2 pt-3 border-t border-[#edf2e8] first:border-t-0 first:mt-0 first:pt-0"
        >
          {renderLinksInText(cleanLine.replace(/:$/, ""), idx)}
        </h4>
      );
    } else {
      elements.push(
        <p key={idx} className="mb-3 text-xs sm:text-sm text-[#5b6b55] leading-relaxed">
          {renderLinksInText(cleanLine, idx)}
        </p>
      );
    }
  });

  return <>{elements}</>;
}

export function renderLinksInText(text: string, baseKey: number | string = 0): React.ReactNode {
  if (!text) return "";
  // Regex to match [link](url), **bold**, *italic*, `code`
  const regex = /\[([^\]]+)\]\(([^)]+)\)|(\*\*|__)(.*?)\3|(\*|_)(.*?)\5|`([^`]+)`/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      // Markdown Link [text](url)
      parts.push(
        <a
          key={`${baseKey}-link-${matchIndex}`}
          href={match[2]}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          className="text-[#3b142e] hover:text-[#5d2a49] underline font-semibold transition-colors inline-block"
        >
          {match[1]}
        </a>
      );
    } else if (match[4] !== undefined) {
      // Markdown Bold **text**
      parts.push(
        <strong key={`${baseKey}-b-${matchIndex}`} className="font-bold text-[#2c3527]">
          {match[4]}
        </strong>
      );
    } else if (match[6] !== undefined) {
      // Markdown Italic *text*
      parts.push(
        <em key={`${baseKey}-i-${matchIndex}`} className="italic">
          {match[6]}
        </em>
      );
    } else if (match[7] !== undefined) {
      // Inline Code `code`
      parts.push(
        <code
          key={`${baseKey}-c-${matchIndex}`}
          className="bg-[#f0f4ec] text-[#2c3527] px-1.5 py-0.5 rounded text-xs font-mono"
        >
          {match[7]}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

