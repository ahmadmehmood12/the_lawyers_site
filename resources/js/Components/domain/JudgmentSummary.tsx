import { BookOpen, Gavel, ListChecks, Scale, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';

export type JudgmentSummaryData = {
    overview?: string | null;
    facts?: string | null;
    issues?: string[] | null;
    held?: string | null;
    reasoning?: string | null;
    laws?: string[] | null;
    outcome?: string | null;
    model?: string | null;
    generated_at?: string | null;
};

/**
 * AI summary written by the judgment scrapers (Claude): overview, outcome, facts, issues, held,
 * reasoning and laws. Always labelled as AI generated; the judgment itself is the authority.
 */
export function JudgmentSummary({ summary }: { summary: JudgmentSummaryData }) {
    const t = useT();
    const issues = (summary.issues ?? []).filter(Boolean);
    const laws = (summary.laws ?? []).filter(Boolean);

    return (
        <section className="overflow-hidden rounded-card border border-navy-100 bg-white dark:border-navy-800 dark:bg-navy-900" aria-labelledby="judgment-summary">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-100 px-5 py-3 dark:border-navy-800">
                <h2 id="judgment-summary" className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-gold-600" />{t('Summary')}</h2>
                <p className="text-xs text-navy-500">{t('AI generated from the judgment. Check it against the judgment before relying on it.')}</p>
            </header>
            <div className="space-y-5 px-5 py-5 text-[15px] leading-relaxed text-navy-800 dark:text-navy-100">
                {summary.overview && <p className="text-base">{summary.overview}</p>}
                {summary.outcome && (
                    <p className="flex items-start gap-2 rounded border-s-4 border-verdant-600 bg-verdant-50 px-4 py-3 font-medium text-verdant-900 dark:bg-verdant-900/30 dark:text-verdant-100">
                        <Gavel className="mt-0.5 size-4 shrink-0" />{summary.outcome}
                    </p>
                )}
                {summary.facts && <Part icon={<BookOpen className="size-4" />} title={t('Facts')}><p>{summary.facts}</p></Part>}
                {issues.length > 0 && (
                    <Part icon={<ListChecks className="size-4" />} title={t('Issues')}>
                        <ol className="list-decimal space-y-1.5 ps-5">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ol>
                    </Part>
                )}
                {summary.held && <Part icon={<Gavel className="size-4" />} title={t('Held')}><p>{summary.held}</p></Part>}
                {summary.reasoning && <Part icon={<Scale className="size-4" />} title={t('Reasoning')}><p className="whitespace-pre-line">{summary.reasoning}</p></Part>}
                {laws.length > 0 && (
                    <Part title={t('Laws and provisions')}>
                        <div className="flex flex-wrap gap-1.5">{laws.map((law) => <span key={law} className="rounded bg-navy-50 px-2 py-1 text-xs font-medium text-navy-700 dark:bg-navy-800 dark:text-navy-200">{law}</span>)}</div>
                    </Part>
                )}
            </div>
        </section>
    );
}

function Part({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
    return (
        <div>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy-500">{icon}{title}</h3>
            {children}
        </div>
    );
}

type Block = { kind: 'point' | 'label' | 'reference' | 'text'; marker?: string; text: string };

const POINT = /^\(\s*([a-z]|[ivx]{1,5}|\d{1,2})\s*\)\s*/i;
const LABEL = /^(held|summary|result|conclusion|facts|issue|issues|question|questions)\s*[:\-–—]+\s*/i;
const REFERENCE = /^(ref(?:erence)?s?|cases? referred|relied upon|citations?)\s*[:\-–—.]+\s*/i;
const STARTS_BLOCK = new RegExp(`${POINT.source}|${LABEL.source}|${REFERENCE.source}|^\\d{1,2}[.)]\\s`, 'i');

/** Remarks as copied from court listings: hard line breaks mid-sentence, "---" separators, (a)/(b) points. */
function remarkBlocks(remarks: string): Block[] {
    const lines = remarks
        .replace(/\s*-{3,}\s*/g, ' — ')
        .split(/\n+/)
        .map((line) => line.replace(/^—\s*/, '').trim())
        .filter(Boolean);

    // Re-join lines that were broken in the middle of a sentence.
    const paragraphs: string[] = [];
    for (const line of lines) {
        const previous = paragraphs[paragraphs.length - 1];
        if (previous !== undefined && !/[.:;?!)"”]$/.test(previous) && !STARTS_BLOCK.test(line)) {
            paragraphs[paragraphs.length - 1] = `${previous} ${line}`;
        } else {
            paragraphs.push(line);
        }
    }

    return paragraphs.map((text) => {
        const point = text.match(POINT);
        if (point) return { kind: 'point', marker: `(${point[1]})`, text: text.slice(point[0].length) };
        const label = text.match(LABEL);
        if (label) return { kind: 'label', marker: label[1].charAt(0).toUpperCase() + label[1].slice(1).toLowerCase(), text: text.slice(label[0].length) };
        if (REFERENCE.test(text)) return { kind: 'reference', text };
        return { kind: 'text', text };
    });
}

/** The court's remarks (headnote), organised into paragraphs, lettered points and references. */
export function JudgmentRemarks({ remarks }: { remarks: string }) {
    const t = useT();
    return (
        <section className="rounded-card border border-navy-100 bg-white dark:border-navy-800 dark:bg-navy-900" aria-labelledby="judgment-remarks">
            <header className="border-b border-navy-100 px-5 py-3 dark:border-navy-800">
                <h2 id="judgment-remarks" className="font-semibold">{t('Remarks')}</h2>
                <p className="text-xs text-navy-500">{t('Headnote as published by the court.')}</p>
            </header>
            <div className="space-y-3 px-5 py-5 text-[15px] leading-relaxed text-navy-800 dark:text-navy-100">
                {remarkBlocks(remarks).map((block, i) => {
                    if (block.kind === 'point') {
                        return (
                            <div key={i} className="flex gap-3">
                                <span className="mt-0.5 grid h-6 min-w-6 shrink-0 place-items-center rounded bg-navy-900 px-1 text-xs font-semibold text-white dark:bg-gold-500 dark:text-navy-950">{block.marker}</span>
                                <p>{block.text}</p>
                            </div>
                        );
                    }
                    if (block.kind === 'label') {
                        return <p key={i}><span className="font-semibold text-navy-900 dark:text-white">{block.marker}: </span>{block.text}</p>;
                    }
                    if (block.kind === 'reference') {
                        return <p key={i} className="border-s-2 border-navy-200 ps-3 text-sm text-navy-500 dark:border-navy-700">{block.text}</p>;
                    }
                    return <p key={i}>{block.text}</p>;
                })}
            </div>
        </section>
    );
}
