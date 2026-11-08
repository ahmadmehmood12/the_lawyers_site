import { useForm } from '@inertiajs/react';
import { UploadCloud } from 'lucide-react';
import { Button, Checkbox, Input, Modal, Select, Textarea } from '@/Components/ui';
import { formatBytes } from '@/lib/format';
import { useT } from '@/lib/i18n';
import type { Option } from '@/types';
import type { SelectOption } from '@/types/domain';

export function DocumentUploadDialog({ open, onClose, categories, caseId, cases, clients }: { open: boolean; onClose: () => void; categories: Option[]; caseId?: number; cases?: SelectOption[]; clients?: SelectOption[] }) {
    const t = useT();
    const form = useForm({ file: null as File | null, title: '', description: '', category: 'pleading', legal_case_id: caseId ? String(caseId) : '', client_id: '', is_confidential: false });

    function submit() {
        form.transform((d) => ({ ...d, legal_case_id: d.legal_case_id || null, client_id: d.client_id || null }));
        form.post(route('documents.store'), { forceFormData: true, preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } });
    }

    return (
        <Modal open={open} onClose={onClose} title={t('Upload document')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button onClick={submit} loading={form.processing} disabled={!form.data.file}>{t('Upload')}</Button></>}>
            <div className="space-y-4">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-navy-200 p-6 text-center hover:border-navy-400 dark:border-navy-700">
                    <UploadCloud className="size-7 text-navy-400" />
                    <span className="text-sm font-medium">{form.data.file ? `${form.data.file.name}, ${formatBytes(form.data.file.size)}` : t('Choose a PDF, Word document or image')}</span>
                    <span className="text-xs text-navy-500">{t('Up to 20 MB. Files are stored privately.')}</span>
                    <input type="file" className="sr-only" accept=".pdf,.doc,.docx,image/*" onChange={(e) => { const f = e.target.files?.[0] ?? null; form.setData((d) => ({ ...d, file: f, title: d.title || (f?.name.replace(/\.[^.]+$/, '') ?? '') })); }} />
                </label>
                {(form.errors.file) && <p className="text-xs text-red-600">{form.errors.file}</p>}
                <Input label={t('Title')} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} required />
                <Select label={t('Category')} value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} options={categories} />
                {!caseId && cases && <Select label={t('Case')} value={form.data.legal_case_id} onChange={(e) => form.setData('legal_case_id', e.target.value)} options={cases} placeholder={t('Not linked')} />}
                {!caseId && clients && <Select label={t('Client')} value={form.data.client_id} onChange={(e) => form.setData('client_id', e.target.value)} options={clients} placeholder={t('Not linked')} />}
                <Textarea label={t('Description')} rows={2} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                <Checkbox label={t('Confidential — restricted to members allowed to view confidential files; cannot be shared with clients')} checked={form.data.is_confidential} onChange={(e) => form.setData('is_confidential', e.target.checked)} />
            </div>
        </Modal>
    );
}
