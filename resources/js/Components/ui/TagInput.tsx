import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

/**
 * Tags as small chips: type a tag and press Enter (or comma) to add it, Backspace on an empty field
 * removes the last one, × removes any. Duplicates (ignoring case) are skipped.
 */
export function TagInput({ label, value, onChange, max = 8, placeholder, error, hint }: {
    label?: string;
    value: string[];
    onChange: (tags: string[]) => void;
    max?: number;
    placeholder?: string;
    error?: string;
    hint?: string;
}) {
    const id = useId();
    const [draft, setDraft] = useState('');

    function add(raw: string) {
        const tag = raw.trim().replace(/,+$/, '').slice(0, 40);
        if (!tag || value.length >= max || value.some((v) => v.toLowerCase() === tag.toLowerCase())) {
            setDraft('');
            return;
        }
        onChange([...value, tag]);
        setDraft('');
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add(draft);
        } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    }

    return (
        <div className="space-y-1.5">
            {label && <label htmlFor={id} className="block text-sm font-medium text-navy-800 dark:text-navy-100">{label}</label>}
            <div className={cn('flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 transition focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500/25 dark:bg-navy-900', error ? 'border-red-400' : 'border-navy-200 dark:border-navy-700')}>
                <AnimatePresence initial={false}>
                    {value.map((tag) => (
                        <motion.span key={tag} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            className="inline-flex items-center gap-1 rounded-full bg-navy-100 py-0.5 pe-1 ps-2.5 text-xs font-medium text-navy-800 dark:bg-navy-800 dark:text-navy-100">
                            #{tag}
                            <button type="button" onClick={() => onChange(value.filter((v) => v !== tag))} aria-label={`Remove ${tag}`} className="grid size-4 place-items-center rounded-full hover:bg-navy-200 dark:hover:bg-navy-700"><X className="size-3" /></button>
                        </motion.span>
                    ))}
                </AnimatePresence>
                <input id={id} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} onBlur={() => draft && add(draft)}
                    disabled={value.length >= max} placeholder={value.length >= max ? '' : placeholder}
                    className="min-w-28 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed" />
            </div>
            {error ? <p className="text-xs text-red-600">{error}</p> : hint && <p className="text-xs text-navy-500">{hint}</p>}
        </div>
    );
}
