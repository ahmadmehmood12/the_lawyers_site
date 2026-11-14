import { Link } from '@inertiajs/react';
import { ArrowRight, FileText, Stamp } from 'lucide-react';
import { Card, CardHeader, EmptyState, PageHeader } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

type Form = { id: number; title: string; category: string; language: string; description: string | null; fields: number };
type Recent = { id: number; title: string; form: string | null; updated_at: string };

/** Wakalatnama and Power of Attorney: pick a form (Workspace\LegalFormController). */
export default function LegalFormsIndex({ forms, recent }: { forms: Form[]; recent: Recent[] }) {
    const t = useT();
    const { locale } = useLocale();
    const labels: Record<string, string> = { wakalatnama: t('Wakalatnama'), 'power-of-attorney': t('Power of attorney'), affidavit: t('Affidavit'), undertaking: t('Undertaking'), other: t('Other') };

    return (
        <AppLayout title={t('Wakalatnama & POA')} wide>
            <PageHeader title={t('Wakalatnama & power of attorney')} description={t('Pick a form, choose the case or client, check the details and it is ready to print. You can still edit every word.')} />
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                {forms.length === 0 ? <Card><EmptyState icon={<Stamp className="size-5" />} title={t('No forms yet')} description={t('The platform team adds forms in Admin, Legal forms.')} /></Card> : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {forms.map((f) => (
                            <Link key={f.id} href={route('legal-forms.show', f.id)} className="group flex flex-col rounded-card border border-navy-100 bg-white p-5 transition hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-card dark:border-navy-800 dark:bg-navy-900 dark:hover:border-navy-600">
                                <span className="mb-4 grid size-11 place-items-center rounded-xl bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300"><Stamp className="size-5" /></span>
                                <p className="text-xs font-medium uppercase tracking-wide text-navy-500">{labels[f.category] ?? f.category}</p>
                                <h2 className="mt-1 font-serif text-xl font-semibold">{f.title}</h2>
                                {f.description && <p className="mt-2 text-sm leading-relaxed text-navy-600 dark:text-navy-300">{f.description}</p>}
                                <p className="mt-auto flex items-center justify-between pt-5 text-sm">
                                    <span className="text-navy-500">{t(':count details to fill', { count: f.fields })}</span>
                                    <span className="inline-flex items-center gap-1 font-semibold text-navy-900 group-hover:gap-2 dark:text-white">{t('Fill in')}<ArrowRight className="size-4 transition-all rtl:rotate-180" /></span>
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
                <Card>
                    <CardHeader title={t('Recently created')} />
                    {recent.length === 0 ? <p className="px-5 pb-5 text-sm text-navy-500">{t('Forms you create appear here.')}</p> : (
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {recent.map((d) => (
                                <li key={d.id}>
                                    <Link href={route('drafts.edit', d.id)} className="flex items-center gap-3 px-5 py-3 hover:bg-navy-50 dark:hover:bg-navy-800">
                                        <FileText className="size-4 shrink-0 text-navy-400" />
                                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{d.title}</span><span className="text-xs text-navy-500">{d.form} · {formatDate(d.updated_at, locale)}</span></span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
