import { Download, Eye, FileText } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatBytes, formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

export default function PortalDocuments({ documents }: { documents: { id: number; title: string; category: string; mime: string | null; size: number | null; source: string; updated_at: string; case: string | null }[] }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <AppLayout title={t('Documents')} area="portal">
            <PageHeader title={t('Documents')} description={t('Documents your lawyers have shared with you, and files you have sent.')} />
            <Card>
                {documents.length === 0 ? <EmptyState icon={<FileText className="size-5" />} title={t('No documents yet')} /> : (
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {documents.map((d) => (
                            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                                <div><p className="font-medium">{d.title}</p><p className="text-xs text-navy-500">{[d.case, d.category, d.size ? formatBytes(d.size) : null, formatDate(d.updated_at, locale)].filter(Boolean).join(', ')}{d.source === 'client' ? `, ${t('Sent by you')}` : ''}</p></div>
                                <div className="flex gap-1">
                                    {d.mime && ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(d.mime) && <a href={route('portal.documents.download', { document: d.id, inline: 1 })} target="_blank" rel="noreferrer" className="rounded p-1.5 hover:bg-navy-100 dark:hover:bg-navy-800" aria-label={t('Preview')}><Eye className="size-4" /></a>}
                                    <a href={route('portal.documents.download', d.id)} className="rounded p-1.5 hover:bg-navy-100 dark:hover:bg-navy-800" aria-label={t('Download')}><Download className="size-4" /></a>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </AppLayout>
    );
}
