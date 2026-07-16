"use client";

import { useEffect, useRef } from "react";

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

function renderMarkdownLike(raw: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = raw.split("\n");

  let listItems: React.ReactNode[] = [];
  let inOrderedList = false;

  function flushList() {
    if (listItems.length > 0) {
      nodes.push(
        <ol key={`ol-${nodes.length}`} className="my-3 list-decimal space-y-1 pl-6">
          {listItems}
        </ol>,
      );
      listItems = [];
      inOrderedList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // Ordered list item: "1. text" or "1) text"
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);

    if (olMatch) {
      inOrderedList = true;
      const content = parseInline(olMatch[2]);
      listItems.push(<li key={`li-${i}`}>{content}</li>);
      continue;
    }

    // Empty line or non-list line ends any active list
    if (inOrderedList) {
      flushList();
    }

    if (trimmed === "") {
      nodes.push(<div key={i} className="h-3" />);
      continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={i} className="my-1.5 leading-relaxed">
        {parseInline(trimmed)}
      </p>,
    );
  }

  // Flush any trailing list
  flushList();

  return nodes;
}

function parseInline(text: string): React.ReactNode {
  // Split on **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className="font-semibold text-amber-300">
          {inner}
        </strong>
      );
    }
    return part;
  });
}

export default function StreamingText({ text, isStreaming }: StreamingTextProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom while streaming
  useEffect(() => {
    if (isStreaming && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [text, isStreaming]);

  const content = renderMarkdownLike(text);

  return (
    <div className="prose-like mx-auto max-w-2xl text-[15px] leading-relaxed text-warm-white/90">
      {/* Rendered content with fade-in per chunk */}
      <div className="animate-fadeIn space-y-0.5">
        {content.map((node, i) => (
          <div
            key={i}
            className="animate-fadeIn"
            style={{ animationDelay: `${Math.min(i * 60, 600)}ms` }}
          >
            {node}
          </div>
        ))}
      </div>

      {/* Blinking cursor while streaming */}
      {isStreaming && (
        <span className="ml-0.5 inline-block animate-pulse text-amber-400" aria-hidden>
          ▍
        </span>
      )}

      {/* Invisible anchor for auto-scroll */}
      <div ref={endRef} />
    </div>
  );
}
