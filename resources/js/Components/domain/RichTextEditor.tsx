import { mergeAttributes, Node } from '@tiptap/core';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Columns3, Heading1, Heading2, Heading3, Italic, List, ListOrdered, Minus, Pilcrow, Quote, Redo2, Rows3, Scissors, Strikethrough, Table, Trash2, Underline, Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

type Props = { value: string; onChange: (html: string) => void; dir?: 'ltr' | 'rtl'; placeholders?: { key: string; label: string }[]; readOnly?: boolean; minHeight?: string; emptyHint?: string; /** Inside dialogs: shorter, toolbar pinned to the top of the dialog. */ compact?: boolean };

/** {{client_name}} style merge fields: one atomic chip, stored as <span class="placeholder">{{key}}</span>. */
const PlaceholderToken = Node.create({
    name: 'placeholderToken',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    addAttributes() {
        return { key: { default: '' } };
    },
    parseHTML() {
        return [{ tag: 'span.placeholder', getAttrs: (el) => ({ key: (el as HTMLElement).textContent?.replace(/[{}]/g, '').trim() ?? '' }) }];
    },
    renderHTML({ node, HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { class: 'placeholder' }), `{{${node.attrs.key}}}`];
    },
    renderText({ node }) {
        return `{{${node.attrs.key}}}`;
    },
});

/** Page break for PDF/Word export, stored as <div class="page-break"></div>. */
const PageBreak = Node.create({
    name: 'pageBreak',
    group: 'block',
    atom: true,
    parseHTML() {
        return [{ tag: 'div.page-break' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { class: 'page-break' })];
    },
});

/**
 * Rich text editor (TipTap 3 / ProseMirror) for drafts, templates, articles and website pages.
 * Replaces the old document.execCommand editor. Output stays plain semantic HTML that
 * App\Support\HtmlSanitizer cleans on every save (only text-align survives as inline style).
 * See docs/Features/Rich-Text-Editor.md.
 */
export function RichTextEditor({ value, onChange, dir = 'ltr', placeholders = [], readOnly, minHeight: minHeightProp, emptyHint, compact = false }: Props) {
    const t = useT();
    const minHeight = minHeightProp ?? (compact ? '320px' : '60vh');
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ code: false, codeBlock: false, heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
            TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
            TableKit.configure({ table: { resizable: false } }),
            Placeholder.configure({ placeholder: emptyHint ?? t('Start writing…') }),
            PlaceholderToken,
            PageBreak,
        ],
        content: value || '',
        editable: !readOnly,
        immediatelyRender: true,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: {
                dir,
                class: cn('prose-legal max-w-none bg-white px-6 py-8 focus:outline-none sm:px-12 dark:bg-navy-950', dir === 'rtl' && 'font-urdu leading-[2.2]'),
                style: `min-height: ${minHeight}`,
            },
        },
        onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    });

    // Outside changes (loading a version, switching language) replace the content without
    // re-emitting, and never fight the cursor while the user types.
    useEffect(() => {
        if (!editor || editor.isDestroyed) return;
        const current = editor.isEmpty ? '' : editor.getHTML();
        if ((value || '') !== current && !editor.isFocused) {
            editor.commands.setContent(value || '', { emitUpdate: false });
        }
    }, [value, editor]);

    useEffect(() => {
        editor?.setEditable(!readOnly);
    }, [readOnly, editor]);

    useEffect(() => {
        editor?.setOptions({ editorProps: { attributes: { dir, class: cn('prose-legal max-w-none bg-white px-6 py-8 focus:outline-none sm:px-12 dark:bg-navy-950', dir === 'rtl' && 'font-urdu leading-[2.2]'), style: `min-height: ${minHeight}` } } });
    }, [dir, minHeight, editor]);

    const state = useEditorState({
        editor,
        selector: ({ editor: e }) => (e ? {
            bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'),
            h1: e.isActive('heading', { level: 1 }), h2: e.isActive('heading', { level: 2 }), h3: e.isActive('heading', { level: 3 }), p: e.isActive('paragraph'),
            ol: e.isActive('orderedList'), ul: e.isActive('bulletList'), quote: e.isActive('blockquote'), table: e.isActive('table'),
            left: e.isActive({ textAlign: 'left' }), center: e.isActive({ textAlign: 'center' }), right: e.isActive({ textAlign: 'right' }), justify: e.isActive({ textAlign: 'justify' }),
            undo: e.can().undo(), redo: e.can().redo(),
        } : null),
    });

    if (!editor) return null;
    const run = () => editor.chain().focus();
    const start = dir === 'rtl' ? 'right' : 'left';
    const end = dir === 'rtl' ? 'left' : 'right';

    const tool = (label: string, icon: ReactNode, onClick: () => void, active = false, disabled = false) => (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={cn('rounded p-1.5 transition-colors disabled:opacity-40', active ? 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950' : 'text-navy-700 hover:bg-navy-100 dark:text-navy-200 dark:hover:bg-navy-800')}
        >
            {icon}
        </button>
    );
    const divider = <span className="mx-1 h-5 w-px bg-navy-200 dark:bg-navy-700" aria-hidden />;

    return (
        <div className="rounded-lg ring-1 ring-navy-200 dark:ring-navy-700">
            {!readOnly && (
                <div className={cn('sticky z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-navy-200 bg-navy-50/95 px-2 py-1 backdrop-blur dark:border-navy-700 dark:bg-navy-900/95', compact ? 'top-0' : 'top-14 lg:top-16')} role="toolbar" aria-label={t('Formatting')}>
                    {tool(t('Undo'), <Undo2 className="size-4" />, () => run().undo().run(), false, !state?.undo)}
                    {tool(t('Redo'), <Redo2 className="size-4" />, () => run().redo().run(), false, !state?.redo)}
                    {divider}
                    {tool(t('Bold'), <Bold className="size-4" />, () => run().toggleBold().run(), state?.bold)}
                    {tool(t('Italic'), <Italic className="size-4" />, () => run().toggleItalic().run(), state?.italic)}
                    {tool(t('Underline'), <Underline className="size-4" />, () => run().toggleUnderline().run(), state?.underline)}
                    {tool(t('Strikethrough'), <Strikethrough className="size-4" />, () => run().toggleStrike().run(), state?.strike)}
                    {divider}
                    {tool(t('Title'), <Heading1 className="size-4" />, () => run().toggleHeading({ level: 1 }).run(), state?.h1)}
                    {tool(t('Heading'), <Heading2 className="size-4" />, () => run().toggleHeading({ level: 2 }).run(), state?.h2)}
                    {tool(t('Subheading'), <Heading3 className="size-4" />, () => run().toggleHeading({ level: 3 }).run(), state?.h3)}
                    {tool(t('Paragraph'), <Pilcrow className="size-4" />, () => run().setParagraph().run(), state?.p && !state?.ol && !state?.ul)}
                    {tool(t('Numbered list'), <ListOrdered className="size-4" />, () => run().toggleOrderedList().run(), state?.ol)}
                    {tool(t('Bullet list'), <List className="size-4" />, () => run().toggleBulletList().run(), state?.ul)}
                    {tool(t('Quote'), <Quote className="size-4" />, () => run().toggleBlockquote().run(), state?.quote)}
                    {divider}
                    {tool(t('Align start'), <AlignLeft className="size-4 rtl:-scale-x-100" />, () => run().setTextAlign(start).run(), dir === 'rtl' ? state?.right : state?.left)}
                    {tool(t('Center'), <AlignCenter className="size-4" />, () => run().setTextAlign('center').run(), state?.center)}
                    {tool(t('Align end'), <AlignRight className="size-4 rtl:-scale-x-100" />, () => run().setTextAlign(end).run(), dir === 'rtl' ? state?.left : state?.right)}
                    {tool(t('Justify'), <AlignJustify className="size-4" />, () => run().setTextAlign('justify').run(), state?.justify)}
                    {divider}
                    {tool(t('Insert table'), <Table className="size-4" />, () => run().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run())}
                    {state?.table && (
                        <>
                            {tool(t('Add row'), <Rows3 className="size-4" />, () => run().addRowAfter().run())}
                            {tool(t('Add column'), <Columns3 className="size-4" />, () => run().addColumnAfter().run())}
                            {tool(t('Delete table'), <Trash2 className="size-4" />, () => run().deleteTable().run())}
                        </>
                    )}
                    {tool(t('Horizontal line'), <Minus className="size-4" />, () => run().setHorizontalRule().run())}
                    {tool(t('Page break'), <Scissors className="size-4" />, () => run().insertContent([{ type: 'pageBreak' }, { type: 'paragraph' }]).run())}
                    {placeholders.length > 0 && (
                        <select
                            value=""
                            onChange={(e) => e.target.value && run().insertContent([{ type: 'placeholderToken', attrs: { key: e.target.value } }, { type: 'text', text: ' ' }]).run()}
                            className="ms-1 h-8 rounded border-0 py-1 text-xs ring-1 ring-navy-200 dark:bg-navy-900 dark:ring-navy-700"
                            aria-label={t('Insert placeholder')}
                        >
                            <option value="">{t('Insert placeholder…')}</option>
                            {placeholders.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                    )}
                </div>
            )}
            {/* Clip here, not on the wrapper: overflow-hidden on the wrapper would break the sticky toolbar. */}
            <EditorContent editor={editor} className={cn('overflow-hidden', readOnly ? 'rounded-lg' : 'rounded-b-lg')} />
        </div>
    );
}
