import { Fragment, type ReactNode } from "react";

/**
 * Renderer Markdown ringan tanpa dependency, untuk jawaban asisten AI. Menangani subset yang biasa dipakai model:
 * **tebal**, *miring*, `kode`, [tautan](url), daftar berpoin (- / *), daftar bernomor (1.), dan judul (#).
 * Sengaja kecil dan aman (tidak mengeksekusi HTML) — cukup untuk balasan chat.
 */

let keySeq = 0;

/** Memformat teks sebaris: tebal, kode, tautan, lalu miring. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(?<![\w*])\*(?!\s)([^*]+?)\*(?![\w*])|(?<![\w_])_(?!\s)([^_]+?)_(?![\w_])/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined) nodes.push(<strong key={`k${keySeq++}`}>{match[1]}</strong>);
    else if (match[2] !== undefined) nodes.push(<code key={`k${keySeq++}`} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/10">{match[2]}</code>);
    else if (match[3] !== undefined) nodes.push(<a key={`k${keySeq++}`} href={match[4]} target="_blank" rel="noreferrer" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">{match[3]}</a>);
    else if (match[5] !== undefined) nodes.push(<em key={`k${keySeq++}`}>{match[5]}</em>);
    else if (match[6] !== undefined) nodes.push(<em key={`k${keySeq++}`}>{match[6]}</em>);
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (!paragraph.length) return;
    const buffer = paragraph;
    paragraph = [];
    blocks.push(
      <p key={`k${keySeq++}`}>
        {buffer.map((line, index) => (
          <Fragment key={index}>
            {renderInline(line)}
            {index < buffer.length - 1 && <br />}
          </Fragment>
        ))}
      </p>,
    );
  };

  for (let i = 0; i < lines.length; ) {
    const line = lines[i];

    if (/^\s*[-*]\s+/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ""));
      blocks.push(
        <ul key={`k${keySeq++}`} className="list-disc space-y-0.5 pl-5">
          {items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ""));
      blocks.push(
        <ol key={`k${keySeq++}`} className="list-decimal space-y-0.5 pl-5">
          {items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push(
        <p key={`k${keySeq++}`} className="font-semibold">
          {renderInline(heading[2])}
        </p>,
      );
      i++;
      continue;
    }

    if (line.trim() === "") {
      flush();
      i++;
      continue;
    }

    paragraph.push(line);
    i++;
  }
  flush();

  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
}
