/**
 * TipTapRenderer — renders TipTap/ProseMirror JSON as rich HTML.
 * Supports text, images, YouTube embeds, headings, lists, links, horizontal rules.
 */
import React from 'react';

interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

function sanitizeUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'javascript:') return '';
    return url;
  } catch {
    return url;
  }
}

function renderMarks(text: string, marks?: { type: string; attrs?: Record<string, unknown> }[]): React.ReactElement {
  if (!marks || marks.length === 0) return <>{text}</>;

  let el: React.ReactElement = <>{text}</>;
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        el = <strong>{el}</strong>;
        break;
      case 'italic':
        el = <em>{el}</em>;
        break;
      case 'underline':
        el = <u>{el}</u>;
        break;
      case 'strike':
        el = <s>{el}</s>;
        break;
      case 'link':
        el = (
          <a
            href={String(mark.attrs?.href ?? '#')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:opacity-80"
          >
            {el}
          </a>
        );
        break;
    }
  }
  return el;
}

function RenderNode({ node, index }: { node: TipTapNode; index: number }) {
  switch (node.type) {
    case 'text':
      return <span key={index}>{renderMarks(node.text ?? '', node.marks)}</span>;

    case 'paragraph':
      return (
        <p key={index} className="mb-3 leading-relaxed" style={{ textAlign: (node.attrs?.textAlign as React.CSSProperties['textAlign']) || undefined }}>
          {node.content?.map((child, i) => <RenderNode key={i} node={child} index={i} />)}
        </p>
      );

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 2;
      const Tag = `h${Math.min(level, 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      const sizes: Record<number, string> = { 1: 'text-2xl', 2: 'text-xl', 3: 'text-lg', 4: 'text-base', 5: 'text-sm', 6: 'text-xs' };
      return (
        <Tag key={index} className={`${sizes[level] || 'text-base'} font-bold mb-2`}>
          {node.content?.map((child, i) => <RenderNode key={i} node={child} index={i} />)}
        </Tag>
      );
    }

    case 'bulletList':
      return (
        <ul key={index} className="list-disc pl-5 mb-3 space-y-1">
          {node.content?.map((child, i) => <RenderNode key={i} node={child} index={i} />)}
        </ul>
      );

    case 'orderedList':
      return (
        <ol key={index} className="list-decimal pl-5 mb-3 space-y-1">
          {node.content?.map((child, i) => <RenderNode key={i} node={child} index={i} />)}
        </ol>
      );

    case 'listItem':
      return (
        <li key={index}>
          {node.content?.map((child, i) => <RenderNode key={i} node={child} index={i} />)}
        </li>
      );

    case 'image': {
      const src = sanitizeUrl(String(node.attrs?.src ?? ''));
      const alt = String(node.attrs?.alt ?? '');
      return (
        <img
          key={index}
          src={src}
          alt={alt}
          className="rounded-lg max-w-full h-auto my-4"
          loading="lazy"
        />
      );
    }

    case 'youtube':
    case 'iframe': {
      const src = sanitizeUrl(String(node.attrs?.src ?? ''));
      const ytMatch = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const embedSrc = ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` : src;
      return (
        <div key={index} className="aspect-video my-4 rounded-lg overflow-hidden">
          <iframe
            src={embedSrc}
            className="w-full h-full"
            allowFullScreen
            loading="lazy"
            title="Video"
          />
        </div>
      );
    }

    case 'horizontalRule':
      return <hr key={index} className="my-4 border-border" />;

    case 'blockquote':
      return (
        <blockquote key={index} className="border-l-4 border-primary/30 pl-4 italic my-3 text-muted-foreground">
          {node.content?.map((child, i) => <RenderNode key={i} node={child} index={i} />)}
        </blockquote>
      );

    case 'codeBlock':
      return (
        <pre key={index} className="bg-muted rounded-lg p-4 my-3 overflow-x-auto text-sm">
          <code>
            {node.content?.map((child, i) => <RenderNode key={i} node={child} index={i} />)}
          </code>
        </pre>
      );

    case 'doc':
      return (
        <>
          {node.content?.map((child, i) => <RenderNode key={i} node={child} index={i} />)}
        </>
      );

    default:
      if (node.content) {
        return (
          <div key={index}>
            {node.content.map((child, i) => <RenderNode key={i} node={child} index={i} />)}
          </div>
        );
      }
      return null;
  }
}

interface TipTapRendererProps {
  content: Record<string, unknown> | string | null | undefined;
  className?: string;
}

export default function TipTapRenderer({ content, className }: TipTapRendererProps) {
  if (!content) return null;

  if (typeof content === 'string') {
    return <p className={className}>{content}</p>;
  }

  const node = content as unknown as TipTapNode;
  if (!node.type && !node.content) return null;

  return (
    <div className={className}>
      <RenderNode node={node.type ? node : { type: 'doc', content: node.content }} index={0} />
    </div>
  );
}
