import { router } from '@inertiajs/react';
import { FilePlus2, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DocumentUploadDialog } from '@/Components/domain/DocumentUploadDialog';
import { Badge, Button, Card, DataTable, PageHeader, Select } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatBytes, formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';
import type { SelectOption } from '@/types/domain';

type Row = { id: number; title: string; category_label: string; is_confidential: boolean; size: number | null; version: number | null; case: { reference: string } | null; client: string | null; uploaded_by: string | null; shared_count: number | null; source: string; updated_at: string };

export default function DocumentsIndex({ documents, filters, options, can }: { documents: Paginated<Row>; filters: Record<string, string>; options: { categories: Option[]; cases: SelectOption[]; clients: SelectOption[] }; can: { upload: boolean } }) {
    const t = useT();
    const { locale } = useLocale();
    const [upload, setUpload] = useState(false);
    useEffect(() => { if (new URLSearchParams(window.location.search).get('upload')) setUpload(true); }, []);
    const visit = (p: Record<string, string | undefined>) => router.get(route('documents.index'), { ...filters, ...p }, { preserveState: true, replace: true });

    return (
        <AppLayout title={t('Document Vault')} wide>
            <PageHeader title={t('Document Vault')} description={t('Private, versioned storage. Every download is logged.')} actions={can.upload && <Button icon={<FilePlus2 className="size-4" />} onClick={() => setUpload(true)}>{t('Upload')}</Button>} />
            <Card>
                <DataTable
                    rows={documents}
                    filters={filters}
                    rowHref={(r) => route('documents.show', r.id)}
                    toolbar={
                        <>
                            <Select aria-label={t('Category')} wrapperClassName="w-40" value={filters.category ?? ''} onChange={(e) => visit({ category: e.target.value || undefined })} options={options.categories} placeholder={t('All categories')} />
                            <Select aria-label={t('Case')} wrapperClassName="w-52" value={filters.case_id ?? ''} onChange={(e) => visit({ case_id: e.target.value || undefined })} options={options.cases} placeholder={t('All cases')} />
                        </>
                    }
                    columns={[
                        { key: 'title', label: t('Document'), render: (r) => (<div><p className="flex items-center gap-1.5 font-medium">{r.is_confidential && <Lock className="size-3.5 text-red-600" />}{r.title}</p><p className="text-xs text-navy-500">{r.category_label}, v{r.version}{r.size ? `, ${formatBytes(r.size)}` : ''}</p></div>) },
                        { key: 'case', label: t('Case / client'), hideOnMobile: true, render: (r) => <span className="text-xs">{[r.case?.reference, r.client].filter(Boolean).join(', ') || '—'}</span> },
                        { key: 'shared', label: t('Sharing'), hideOnMobile: true, render: (r) => (<span className="flex gap-1">{(r.shared_count ?? 0) > 0 && <Badge tone="green">{t('Shared')}</Badge>}{r.source === 'client' && <Badge tone="blue">{t('From client')}</Badge>}</span>) },
                        { key: 'updated_at', label: t('Updated'), render: (r) => formatDate(r.updated_at, locale) },
                    ]}
                />
            </Card>
            {can.upload && <DocumentUploadDialog open={upload} onClose={() => setUpload(false)} categories={options.categories} cases={options.cases} clients={options.clients} />}
        </AppLayout>
    );
}
