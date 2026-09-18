import React from 'react';

interface Props {
  text: string;
}

export const MarkdownRenderer: React.FC<Props> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        // 1. Check for empty lines
        if (trimmed === '') {
          return <div key={index} className="h-2" />;
        }

        // 2. Check for Headings
        if (trimmed.startsWith('###')) {
          const content = parseInline(trimmed.substring(3).trim());
          return (
            <h3 key={index} className="text-base font-black text-slate-900 dark:text-slate-100 mt-4 mb-2 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1 uppercase tracking-wider">
              {content}
            </h3>
          );
        }

        if (trimmed.startsWith('##')) {
          const content = parseInline(trimmed.substring(2).trim());
          return (
            <h2 key={index} className="text-lg font-black text-slate-900 dark:text-slate-100 mt-5 mb-2.5 flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-700">
              {content}
            </h2>
          );
        }

        if (trimmed.startsWith('#')) {
          const content = parseInline(trimmed.substring(1).trim());
          return (
            <h1 key={index} className="text-xl font-extrabold text-slate-900 dark:text-white mt-6 mb-3">
              {content}
            </h1>
          );
        }

        // 3. Check for list items
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          // Check for sub-list / indented bullet
          const isIndented = line.startsWith('  ') || line.startsWith('\t');
          const content = parseInline(trimmed.substring(1).trim());
          return (
            <div
              key={index}
              className={`flex items-start gap-2 ${isIndented ? 'pl-6 text-xs text-slate-600 dark:text-slate-400' : 'pl-2 text-slate-700 dark:text-slate-300'}`}
            >
              <span className="text-emerald-500 font-bold shrink-0 mt-1">•</span>
              <span className="flex-1">{content}</span>
            </div>
          );
        }

        // 4. Check for numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          const num = numMatch[1];
          const content = parseInline(numMatch[2]);
          return (
            <div key={index} className="flex items-start gap-2 pl-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold shrink-0">{num}.</span>
              <span className="flex-1">{content}</span>
            </div>
          );
        }

        // 5. Default paragraph
        return (
          <p key={index} className="text-slate-700 dark:text-slate-300 pl-1">
            {parseInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

// Simple inline parser for **bold**, *italic*, `code`, and checkmarks
function parseInline(text: string): React.ReactNode[] {
  let parts: React.ReactNode[] = [];
  let currentText = text;
  let keyIdx = 0;

  // Quick replacements for standard icons/badges
  if (currentText.startsWith('✓')) {
    parts.push(
      <span key={`check-${keyIdx++}`} className="inline-flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-1.5 py-0.5 rounded-sm mr-1.5 shrink-0">
        ✓ Verified
      </span>
    );
    currentText = currentText.substring(1).trim();
  }

  if (currentText.startsWith('⚠️') || currentText.startsWith('⚠')) {
    parts.push(
      <span key={`alert-${keyIdx++}`} className="inline-flex items-center justify-center bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-bold px-1.5 py-0.5 rounded-sm mr-1.5 shrink-0 animate-pulse">
        ⚠️ Warning
      </span>
    );
    // Remove the emoji length
    currentText = currentText.replace(/^⚠️|^⚠/, '').trim();
  }

  if (currentText.startsWith('🔒')) {
    parts.push(
      <span key={`lock-${keyIdx++}`} className="inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-1.5 py-0.5 rounded-sm mr-1.5 shrink-0">
        🔒 Locked
      </span>
    );
    currentText = currentText.substring(2).trim();
  }

  // Regex tokenizer for bold (**), italic (*), and inline code (`)
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const segments = currentText.split(regex);

  segments.forEach((seg, index) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      parts.push(
        <strong key={index} className="font-extrabold text-slate-950 dark:text-white">
          {seg.slice(2, -2)}
        </strong>
      );
    } else if (seg.startsWith('*') && seg.endsWith('*')) {
      parts.push(
        <em key={index} className="italic text-slate-800 dark:text-slate-200">
          {seg.slice(1, -1)}
        </em>
      );
    } else if (seg.startsWith('`') && seg.endsWith('`')) {
      parts.push(
        <code key={index} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-rose-600 dark:text-rose-400 break-all font-bold">
          {seg.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(seg);
    }
  });

  return parts;
}
