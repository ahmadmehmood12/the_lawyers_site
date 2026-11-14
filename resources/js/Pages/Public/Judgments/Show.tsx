import { Link } from '@inertiajs/react';
import { ArrowLeft, Download, ExternalLink, FileText } from 'lucide-react';
import { Card, CardHeader } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Judgment } from './Index';

/** One reported judgment: details, the PDF and more from the same bench. */
export default function JudgmentShow({ judgment: j, related, canonical }: { judgment: Judgment; related: Judgment[]; canonical: string }) {
    const t = useT();
    const { locale } = useLocale();
    const rows: [string, string | null][] = [
        [t('Court'), j.court_name], [t('Case'), `${j.case_type} ${j.case_number}`], [t('Bench'), j.judges], [t('Citation'), j.citation],
        [t('Decision date'), j.decision_date ? formatDate(j.decision_date, locale) : null], [t('Uploaded on'), formatDate(j.uploaded_on, locale)],
    ];
    return (
        <PublicLayout seo={{ title: `${j.case_type} ${j.case_number} (${j.title})`, description: j.tag_line ?? `${j.court_name}, ${j.judges}`, canonical }}>
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                <Link href={route('judgments.index', { court: j.court })} className="inline-flex items-center gap-1.5 text-sm text-navy-600 hover:underline dark:text-navy-300"><ArrowLeft className="size-4 rtl:rotate-180" />{j.court_name}</Link>
                <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-4xl">{j.title}</h1>
                <p className="mt-2 text-lg text-navy-600 dark:text-navy-300">{j.case_type} {j.case_number} · {t('by')} {j.judges}</p>
                <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="space-y-6">
                        {j.tag_line && <blockquote className="rounded-card border-s-4 border-gold-500 bg-gold-50/60 px-5 py-4 text-lg italic leading-relaxed text-navy-800 dark:bg-gold-500/10 dark:text-navy-100">{j.tag_line}</blockquote>}
                        {j.pdf_url ? (
                            <div className="overflow-hidden rounded-card border border-navy-100 dark:border-navy-800">
                                <iframe src={j.pdf_url} title={j.title} className="h-[80dvh] w-full bg-white" />
                            </div>
                        ) : (
                            <div className="rounded-card border border-dashed border-navy-200 px-6 py-12 text-center dark:border-navy-700">
                                <FileText className="mx-auto size-8 text-navy-300" />
                                <p className="mt-3 font-medium">{t('The full text is not uploaded here yet.')}</p>
                                {j.source_url && <a href={j.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline">{t('Read it on the court’s website')}<ExternalLink className="size-4" /></a>}
                            </div>
                        )}
                    </div>
                    <div className="space-y-6 lg:sticky lg:top-24">
                        <Card>
                            <dl className="divide-y divide-navy-100 dark:divide-navy-800">
                                {rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="px-5 py-3"><dt className="text-xs text-navy-500">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>)}
                            </dl>
                            {(j.pdf_url || j.source_url) && (
                                <div className="flex gap-2 border-t border-navy-100 p-4 dark:border-navy-800">
                                    {j.pdf_url && <a href={j.pdf_url} download className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white dark:bg-gold-500 dark:text-navy-950"><Download className="size-4" />PDF</a>}
                                    {j.source_url && <a href={j.source_url} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-navy-200 dark:ring-navy-700"><ExternalLink className="size-4" />{t('Source')}</a>}
                                </div>
                            )}
                        </Card>
                        {related.length > 0 && (
                            <Card>
                                <CardHeader title={t('More from this bench')} />
                                <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                                    {related.map((r) => <li key={r.id}><Link href={route('judgments.show', r.slug)} className="block px-5 py-3 text-sm hover:bg-navy-50 dark:hover:bg-navy-800"><span className="font-medium">{r.case_type} {r.case_number}</span><span className="block truncate text-navy-500">{r.title}</span></Link></li>)}
                                </ul>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
