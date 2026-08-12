'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface RichTextRendererProps {
  content?: string | null;
  className?: string;
}

/**
 * Checks if a string contains basic HTML markup.
 */
function isHTML(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

/**
 * Parses legacy plain text into paragraphs or bullet/numbered list items.
 */
function renderLegacyPlainText(text: string) {
  if (!text || !text.trim()) return null;

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Check if lines are a bullet or numbered list
  const isBulletList = lines.length > 0 && lines.every((line) => /^[-•*]\s+/.test(line));
  const isNumberedList = lines.length > 0 && lines.every((line) => /^\d+[\.\)]\s+/.test(line));

  if (isBulletList) {
    return (
      <ul className="list-disc pl-5 space-y-1 my-1">
        {lines.map((line, idx) => (
          <li key={idx}>{line.replace(/^[-•*]\s+/, '')}</li>
        ))}
      </ul>
    );
  }

  if (isNumberedList) {
    return (
      <ol className="list-decimal pl-5 space-y-1 my-1">
        {lines.map((line, idx) => (
          <li key={idx}>{line.replace(/^\d+[\.\)]\s+/, '')}</li>
        ))}
      </ol>
    );
  }

  // Mixed or paragraph text
  const blocks = text.split(/\n+/).filter(Boolean);
  return (
    <div className="space-y-2">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (/^[-•*]\s+/.test(trimmed)) {
          return (
            <ul key={idx} className="list-disc pl-5 my-1">
              <li>{trimmed.replace(/^[-•*]\s+/, '')}</li>
            </ul>
          );
        }
        if (/^\d+[\.\)]\s+/.test(trimmed)) {
          return (
            <ol key={idx} className="list-decimal pl-5 my-1">
              <li>{trimmed.replace(/^\d+[\.\)]\s+/, '')}</li>
            </ol>
          );
        }
        return <p key={idx}>{trimmed}</p>;
      })}
    </div>
  );
}

export function RichTextRenderer({ content, className }: RichTextRendererProps) {
  if (!content || !content.trim()) return null;

  const hasHTML = isHTML(content);

  if (hasHTML) {
    return (
      <div
        className={cn(
          'prose prose-sm max-w-none dark:prose-invert text-foreground',
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5',
          '[&_li]:my-0.5',
          '[&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
          '[&_strong]:font-semibold',
          className
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className={cn('text-sm text-foreground leading-relaxed', className)}>
      {renderLegacyPlainText(content)}
    </div>
  );
}
