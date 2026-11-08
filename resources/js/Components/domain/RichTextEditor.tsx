import { AlignCenter, AlignLeft, AlignRight, Bold, Heading1, Heading2, Heading3, Italic, List, ListOrdered, Pilcrow, Redo2, Scissors, Table, Underline, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

type Props = { value: string; onChange: (html: string) => void; dir?: 'ltr' | 'rtl'; placeholders?: { key: string; label: string }[]; readOnly?: boolean };

/**
 * Dependency-free rich text editor for legal drafting (contentEditable).
 * Output is sanitized server-side (App\Support\HtmlSanitizer) on every save.
 */
export function RichTextEditor({ value, onChange, dir = 'ltr', placeholders = [], readOnly }: Props) {
    const t = useT();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
    }, [value]);

    const exec = (command: string, arg?: string) => {
        ref.current?.focus();
        document.execCommand(command, false, arg);
        emit();
    };
    const insertHtml = (html: string) => exec('insertHTML', html);
    const emit = () => ref.current && onChange(ref.current.innerHTML);

    const tool = (label: string, icon: ReactNode, onClick: () => void) => (
        <button type="button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="rounded p-1.5 text-navy-700 hover:bg-navy-100 dark:text-navy-200 dark:hover:bg-navy-800">
            {icon}
        </button>
    );

    return (
        <div className="overflow-hidden rounded-lg ring-1 ring-navy-200 dark:ring-navy-700">
            {!readOnly && (
                <div className="sticky top-14 z-10 flex flex-wrap items-center gap-0.5 border-b border-navy-200 bg-navy-50/95 px-2 py-1 backdrop-blur lg:top-16 dark:border-navy-700 dark:bg-navy-900/95">
                    {tool(t('Undo'), <Undo2 className="size-4" />, () => exec('undo'))}
                    {tool(t('Redo'), <Redo2 className="size-4" />, () => exec('redo'))}
                    <span className="mx-1 h-5 w-px bg-navy-200 dark:bg-navy-700" />
                    {tool(t('Bold'), <Bold className="size-4" />, () => exec('bold'))}
                    {tool(t('Italic'), <Italic className="size-4" />, () => exec('italic'))}
                    {tool(t('Underline'), <Underline className="size-4" />, () => exec('underline'))}
                    <span className="mx-1 h-5 w-px bg-navy-200 dark:bg-navy-700" />
                    {tool(t('Title'), <Heading1 className="size-4" />, () => exec('formatBlock', 'H1'))}
                    {tool(t('Heading'), <Heading2 className="size-4" />, () => exec('formatBlock', 'H2'))}
                    {tool(t('Subheading'), <Heading3 className="size-4" />, () => exec('formatBlock', 'H3'))}
                    {tool(t('Paragraph'), <Pilcrow className="size-4" />, () => exec('formatBlock', 'P'))}
                    {tool(t('Numbered list'), <ListOrdered className="size-4" />, () => exec('insertOrderedList'))}
                    {tool(t('Bullet list'), <List className="size-4" />, () => exec('insertUnorderedList'))}
                    <span className="mx-1 h-5 w-px bg-navy-200 dark:bg-navy-700" />
                    {tool(t('Align start'), <AlignLeft className="size-4" />, () => exec(dir === 'rtl' ? 'justifyRight' : 'justifyLeft'))}
                    {tool(t('Center'), <AlignCenter className="size-4" />, () => exec('justifyCenter'))}
                    {tool(t('Align end'), <AlignRight className="size-4" />, () => exec(dir === 'rtl' ? 'justifyLeft' : 'justifyRight'))}
                    <span className="mx-1 h-5 w-px bg-navy-200 dark:bg-navy-700" />
                    {tool(t('Insert table'), <Table className="size-4" />, () => insertHtml('<table><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p></p>'))}
                    {tool(t('Page break'), <Scissors className="size-4" />, () => insertHtml('<div class="page-break"></div><p></p>'))}
                    {placeholders.length > 0 && (
                        <select value="" onChange={(e) => e.target.value && insertHtml(`<span class="placeholder">{{${e.target.value}}}</span>&nbsp;`)} className="ms-1 rounded border-0 py-1 text-xs ring-1 ring-navy-200 dark:bg-navy-900 dark:ring-navy-700" aria-label={t('Insert placeholder')}>
                            <option value="">{t('Insert placeholder…')}</option>
                            {placeholders.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                    )}
                </div>
            )}
            <div
                ref={ref}
                dir={dir}
                contentEditable={!readOnly}
                suppressContentEditableWarning
                onInput={emit}
                onBlur={emit}
                className={cn('prose-legal min-h-[60vh] bg-white px-6 py-8 focus:outline-none sm:px-12 dark:bg-navy-950', dir === 'rtl' && 'font-urdu leading-[2.2]')}
            />
        </div>
    );
}
