import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extensions';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Palette,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, apiErrorMessage } from '@/lib/api';
import { prepareImageForUpload } from '@/lib/prepareImage';
import { cn } from '@/lib/cn';

interface RichTextEditorProps {
  /** HTML. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  error?: string;
}

function ToolButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // The editor must keep its selection while a toolbar button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40',
        active && 'bg-slate-200 text-slate-900'
      )}
    >
      {children}
    </button>
  );
}

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px bg-slate-300" />;

// Page text is shown on a white panel on the storefront, so the palette is the colours that read well on white.
const TEXT_COLOURS = [
  { label: 'Black', value: '#111827' },
  { label: 'Dark grey', value: '#4b5563' },
  { label: 'Grey', value: '#9ca3af' },
  { label: 'Maroon', value: '#6b3410' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Gold', value: '#d4932f' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Pink', value: '#db2777' },
];

/** Accepts what a shopper's browser can open: a site path, a web / mail / phone link — never javascript:. */
function normaliseLink(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^(\/(?!\/)|https?:\/\/|mailto:|tel:|#)/i.test(value)) return value;
  // "example.com/offer" typed without a scheme.
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(value)) return `https://${value}`;
  return null;
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [linkError, setLinkError] = useState(false);
  const [colourOpen, setColourOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // The colour of the text at the cursor / selection ("" when it has the page's default colour).
  const colour = (editor.getAttributes('textStyle').color as string | undefined) ?? '';

  function applyColour(value: string, close = true) {
    editor.chain().focus().setColor(value).run();
    if (close) setColourOpen(false);
  }

  function clearColour() {
    editor.chain().focus().unsetColor().run();
    setColourOpen(false);
  }

  function openLink() {
    setColourOpen(false);
    setLinkValue((editor.getAttributes('link').href as string | undefined) ?? '');
    setLinkError(false);
    setLinkOpen(true);
  }

  function applyLink() {
    const href = normaliseLink(linkValue);
    if (!href) {
      setLinkError(true);
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    setLinkOpen(false);
  }

  function closeLink() {
    setLinkOpen(false);
    editor.chain().focus().run();
  }

  function removeLink() {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkOpen(false);
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', await prepareImageForUpload(file));
      const res = await api.post<{ data: { url: string } }>('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      editor.chain().focus().setImage({ src: res.data.data.url, alt: file.name.replace(/\.[^.]+$/, '') }).run();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Image upload failed'));
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="border-b border-field-border bg-slate-100/60">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5">
        <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Underline className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Text colour" active={colourOpen || Boolean(colour)} onClick={() => { setLinkOpen(false); setColourOpen((open) => !open); }}>
          <span className="flex flex-col items-center gap-px">
            <Palette className="h-4 w-4" />
            <span aria-hidden className="h-[3px] w-4 rounded-full" style={{ background: colour || 'transparent' }} />
          </span>
        </ToolButton>
        <Divider />
        <ToolButton label="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Sub-heading" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Divider line" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton label="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Align centre" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton label="Link" active={editor.isActive('link') || linkOpen} onClick={openLink}>
          <Link2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Remove link" disabled={!editor.isActive('link')} onClick={removeLink}>
          <Unlink className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Insert image" disabled={isUploading} onClick={() => fileRef.current?.click()}>
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </ToolButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Choose an image to insert"
          onChange={(e) => void uploadImage(e.target.files?.[0])}
        />
        <Divider />
        <ToolButton label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <RemoveFormatting className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolButton>
      </div>

      {colourOpen && (
        <div role="group" aria-label="Text colour" className="flex flex-wrap items-center gap-1.5 border-t border-field-border px-2 py-2">
          {TEXT_COLOURS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              aria-label={c.label}
              aria-pressed={colour.toLowerCase() === c.value}
              // The editor must keep its selection while a colour is picked.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyColour(c.value)}
              className="h-6 w-6 rounded-full border border-slate-400/60 transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-brand-accent aria-pressed:ring-offset-1"
              style={{ background: c.value }}
            />
          ))}
          <label className="ml-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
            Custom
            <input
              type="color"
              aria-label="Custom colour"
              value={/^#[0-9a-f]{6}$/i.test(colour) ? colour : '#ffffff'}
              onChange={(e) => applyColour(e.target.value, false)}
              className="h-6 w-8 cursor-pointer rounded border border-field-border bg-transparent p-0"
            />
          </label>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearColour}
            className="h-7 rounded-md px-2 text-xs text-slate-500 hover:bg-slate-200 hover:text-slate-800"
          >
            Default colour
          </button>
        </div>
      )}

      {linkOpen && (
        <div className="flex flex-wrap items-center gap-2 border-t border-field-border px-2 py-2">
          <input
            autoFocus
            value={linkValue}
            onChange={(e) => {
              setLinkValue(e.target.value);
              setLinkError(false);
            }}
            onKeyDown={(e) => {
              // This sits inside the page <form>: Enter applies the link, it must not save the page.
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              }
              if (e.key === 'Escape') closeLink();
            }}
            aria-label="Link address"
            aria-invalid={linkError}
            placeholder="/pages/careers  or  https://example.com"
            className="h-8 min-w-0 flex-1 rounded-md border border-field-border bg-field px-2 text-sm text-slate-900 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent aria-[invalid=true]:border-red-500"
          />
          <button type="button" onClick={applyLink} className="h-8 rounded-md bg-slate-200 px-3 text-xs font-medium text-slate-900 hover:bg-slate-300">
            Apply
          </button>
          <button type="button" onClick={closeLink} className="h-8 rounded-md px-2 text-xs text-slate-500 hover:text-slate-800">
            Cancel
          </button>
          {linkError && <span role="alert" className="basis-full text-xs text-red-500">Enter a page path like /about, or a full link like https://…</span>}
        </div>
      )}
    </div>
  );
}

/**
 * The rich text editor for page content (Tiptap). Produces HTML; the API cleans it again before storing it,
 * so nothing unsafe can reach the storefront whatever is pasted in here.
 */
export function RichTextEditor({ value, onChange, placeholder = 'Start writing…', error }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } },
      }),
      Image,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    editorProps: { attributes: { 'aria-label': 'Page content', 'aria-invalid': String(Boolean(error)) } },
  });

  // Pick up content that arrives after the editor was created (the page loading, or the form resetting).
  useEffect(() => {
    if (!editor || value === (editor.isEmpty ? '' : editor.getHTML())) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-field-border bg-field transition-colors focus-within:border-brand-accent focus-within:ring-1 focus-within:ring-brand-accent',
        error && 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500'
      )}
    >
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className="rich-editor" />
    </div>
  );
}
