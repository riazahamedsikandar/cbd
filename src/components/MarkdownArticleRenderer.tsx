import React from "react";
import { parseAndRenderSeoLinks, renderLinksInText } from "../utils/seoLinkParser";

interface MarkdownArticleRendererProps {
  content: string;
}

interface BlockGroup {
  type: "text" | "bullet" | "numbered";
  items: string[];
}

function parseBlockSequentially(block: string): BlockGroup[] {
  const rawLines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^#+\s*$/.test(l) && !/^[-*•]\s*$/.test(l));

  const groups: BlockGroup[] = [];
  let currentGroup: BlockGroup | null = null;

  for (const line of rawLines) {
    const isBullet = /^[-*•]\s+/.test(line);
    const isNumbered = /^\d+[\.\)]\s+/.test(line);

    const type: "text" | "bullet" | "numbered" = isBullet
      ? "bullet"
      : isNumbered
      ? "numbered"
      : "text";

    if (!currentGroup || currentGroup.type !== type) {
      currentGroup = { type, items: [] };
      groups.push(currentGroup);
    }

    if (isBullet) {
      const clean = line.replace(/^[-*•\s]+/, "").trim();
      if (clean && !/^[-*•#\s\._]+$/.test(clean)) {
        currentGroup.items.push(clean);
      }
    } else if (isNumbered) {
      const clean = line.replace(/^\d+[\.\)]\s+/, "").trim();
      if (clean && !/^[-*•#\s\._]+$/.test(clean)) {
        currentGroup.items.push(clean);
      }
    } else {
      if (!/^#+\s*$/.test(line)) {
        currentGroup.items.push(line);
      }
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export default function MarkdownArticleRenderer({ content }: MarkdownArticleRendererProps) {
  if (!content) return null;

  // 1. Clean frontmatter if present
  let text = content.trim();
  if (text.startsWith("---")) {
    text = text.replace(/^---[\s\S]*?---\s*/, "");
  } else if (/^(post_title|title|url|slug|meta_title|meta_description):/i.test(text)) {
    text = text.replace(/^(?:post_title|title|url|slug|meta_title|meta_description|category|author|date|image|tags):[^\n]*\n+/gmi, "");
  }

  // 2. Remove draft / internal notes
  text = text.replace(/>?\s*\*\*INTERNAL NOTE[\s\S]*?\*\*[^\n]*\n(?:>?[^\n]*\n)*/gi, "");

  // 3. Normalize newlines
  text = text.replace(/\r\n/g, "\n");

  // 4. Ensure headings have proper spacing before and after
  text = text.replace(/(?<!\n)(#{1,4}\s+[^\n]+)/g, "\n\n$1\n\n");

  // 5. Split into blocks by double newlines and filter empty/hash blocks
  const rawBlocks = text
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter((b) => b && !/^#+\s*$/.test(b) && !/^[-*•]\s*$/.test(b));

  const elements: React.ReactNode[] = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i];

    // Blockquote
    if (block.startsWith(">")) {
      const bqText = block.replace(/^>+\s?/gm, "").trim();
      elements.push(
        <blockquote key={`bq-${i}`} className="my-6 pl-4 sm:pl-6 py-3 border-l-4 border-[#3b142e] bg-[#f7f9f4] rounded-r-xl text-sm sm:text-base italic text-[#5b6b55] leading-relaxed">
          {parseAndRenderSeoLinks(bqText)}
        </blockquote>
      );
      continue;
    }

    // Heading 1 (# Heading)
    if (block.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-[#2c3527] mt-10 mb-4 pb-3 border-b border-[#e1e8db] leading-tight">
          {block.replace(/^#\s+/, "")}
        </h1>
      );
      continue;
    }

    // Heading 2 (## Heading)
    if (block.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl sm:text-2xl md:text-3xl font-serif font-black text-[#2c3527] mt-10 mb-4 pb-2 border-b border-[#edf2e8] leading-snug">
          {block.replace(/^##\s+/, "")}
        </h2>
      );
      continue;
    }

    // Heading 3 (### Heading)
    if (block.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg sm:text-xl md:text-2xl font-serif font-bold text-[#2c3527] mt-8 mb-3 leading-snug">
          {block.replace(/^###\s+/, "")}
        </h3>
      );
      continue;
    }

    // Heading 4 (#### Heading)
    if (block.startsWith("#### ")) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-base sm:text-lg font-sans font-bold text-[#3b142e] uppercase tracking-wide mt-6 mb-2">
          {block.replace(/^####\s+/, "")}
        </h4>
      );
      continue;
    }

    // Sequential multi-line parser for mixed content (paragraphs + lists in exact order)
    const groups = parseBlockSequentially(block);

    elements.push(
      <div key={`block-${i}`} className="space-y-3">
        {groups.map((group, gIdx) => {
          if (group.type === "bullet") {
            return (
              <ul key={`ul-${i}-${gIdx}`} className="list-disc list-outside pl-6 space-y-1.5 my-3 text-sm sm:text-base text-[#5b6b55] leading-relaxed">
                {group.items.map((item, idx) => (
                  <li key={idx} className="pl-1">
                    {renderLinksInText(item, `${i}-${gIdx}-${idx}`)}
                  </li>
                ))}
              </ul>
            );
          }

          if (group.type === "numbered") {
            return (
              <ol key={`ol-${i}-${gIdx}`} className="list-decimal list-outside pl-6 space-y-1.5 my-3 text-sm sm:text-base text-[#5b6b55] leading-relaxed">
                {group.items.map((item, idx) => (
                  <li key={idx} className="pl-1">
                    {renderLinksInText(item, `${i}-${gIdx}-${idx}`)}
                  </li>
                ))}
              </ol>
            );
          }

          return (
            <div key={`txt-${i}-${gIdx}`} className="space-y-2">
              {group.items.map((line, lIdx) => {
                const isHeadingLike = line.endsWith(":") && line.length < 60;
                return (
                  <div
                    key={lIdx}
                    className={`text-sm sm:text-base leading-relaxed ${
                      isHeadingLike
                        ? "text-[#2c3527] font-semibold mt-4 mb-1"
                        : "text-[#5b6b55]"
                    }`}
                  >
                    {parseAndRenderSeoLinks(line)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  return <div className="space-y-5 font-sans max-w-none text-[#5b6b55]">{elements}</div>;
}
