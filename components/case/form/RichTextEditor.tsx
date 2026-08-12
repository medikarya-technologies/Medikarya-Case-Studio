'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, List, ListOrdered } from 'lucide-react';
import { useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface RichTextEditorProps {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder,
  className,
  minHeight = '100px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
    ],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none p-3 text-sm text-foreground',
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1',
          '[&_li]:my-0.5',
          '[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0'
        ),
        style: `min-height: ${minHeight};`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html === '<p></p>') {
        onChange?.('');
      } else {
        onChange?.(html);
      }
    },
  });

  // Sync editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentHTML = editor.getHTML();
      const normalizedValue = value === '<p></p>' ? '' : value;
      const normalizedCurrent = currentHTML === '<p></p>' ? '' : currentHTML;

      if (normalizedValue !== normalizedCurrent) {
        editor.commands.setContent(value || '');
      }
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          'border border-input rounded-md bg-background p-3 text-sm text-muted-foreground animate-pulse',
          className
        )}
        style={{ minHeight }}
      >
        Loading editor...
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border border-input rounded-md bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-colors',
        className
      )}
    >
      {/* Minimal Toolbar */}
      <div className="flex items-center gap-1 p-1.5 border-b bg-muted/30 text-muted-foreground select-none">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={cn(
            'p-1.5 rounded hover:bg-muted text-xs font-medium flex items-center justify-center transition-colors',
            editor.isActive('bold')
              ? 'bg-accent text-accent-foreground font-bold shadow-xs'
              : 'hover:text-foreground'
          )}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            'p-1.5 rounded hover:bg-muted text-xs font-medium flex items-center justify-center transition-colors',
            editor.isActive('bulletList')
              ? 'bg-accent text-accent-foreground font-bold shadow-xs'
              : 'hover:text-foreground'
          )}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            'p-1.5 rounded hover:bg-muted text-xs font-medium flex items-center justify-center transition-colors',
            editor.isActive('orderedList')
              ? 'bg-accent text-accent-foreground font-bold shadow-xs'
              : 'hover:text-foreground'
          )}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} />
    </div>
  );
}
