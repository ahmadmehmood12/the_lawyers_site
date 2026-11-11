import { Link, router, useForm } from '@inertiajs/react';
import { Building, Gavel, Landmark, Layers, Map as MapIcon, MapPin, MapPinned, Pencil, Plus, Scale, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, Checkbox, ConfirmAction, DataTable, Input, Modal, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

type Field = { name: string; label: string; type: 'text' | 'textarea' | 'number' | 'boolean' | 'select'; options?: { value: string | number; label: string }[] };
type Row = Record<string, any> & { id: number; _display: Record<string, string> };
type Kpi = { key: string; label: string; total: number; active: number | null };

const kpiIcons: Record<string, typeof Landmark> = { courts: Landmark, judges: Gavel, specializations: Tags, provinces: MapIcon, districts: MapPinned, cities: Building, tehsils: MapPin, 'court-types': Layers, 'bar-councils': Scale };

export default function Reference({ resource, resources, kpis, label, fields, rows, filters }: { resource: string; resources: { key: string; label: string }[]; kpis: Kpi[]; label: string; fields: Field[]; rows: Paginated<Row>; filters: Record<string, string> }) {
    const t = useT();
    const [editing, setEditing] = useState<Row | null | undefined>(undefined);
    const listed = fields.filter((f) => f.type !== 'textarea').slice(0, 4);
    return (
        <AppLayout title={label} area="admin" wide>
            <PageHeader title={label} description={t('Reference data used across case files, the directory and the court diary.')} actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{t('Add')}</Button>} />
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8" aria-label={t('Reference data totals')}>
                {kpis.map((k) => {
                    const Icon = kpiIcons[k.key] ?? Tags;
                    return (
                        <Link key={k.key} href={route('admin.reference.index', k.key)} aria-current={k.key === resource ? 'page' : undefined}
                            className={cn('rounded-card border bg-white px-4 py-3 transition-colors hover:border-navy-300 dark:bg-navy-900 dark:hover:border-navy-600', k.key === resource ? 'border-navy-900 ring-1 ring-navy-900 dark:border-gold-500 dark:ring-gold-500' : 'border-navy-100 dark:border-navy-800')}>
                            <span className="flex items-center gap-1.5 text-xs font-medium text-navy-500 dark:text-navy-400"><Icon className="size-3.5" aria-hidden />{k.label}</span>
                            <span className="mt-1 block text-2xl font-semibold text-navy-900 tabular-nums dark:text-white">{k.total.toLocaleString()}</span>
                            {k.active !== null && <span className="block text-[11px] text-navy-500">{t(':count active', { count: k.active })}</span>}
                        </Link>
                    );
                })}
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5">{resources.map((r) => <Link key={r.key} href={route('admin.reference.index', r.key)} className={cn('rounded-full px-3 py-1 text-sm ring-1 ring-inset ring-navy-200 dark:ring-navy-700', r.key === resource && 'bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950')}>{r.label}</Link>)}</div>
            <Card>
                <DataTable rows={rows} filters={filters}
                    columns={[...listed.map((f) => ({ key: f.name, label: f.label, render: (r: Row) => f.type === 'boolean' ? (r[f.name] ? '✓' : '—') : (r._display?.[f.name] ?? (f.type === 'select' ? f.options?.find((o) => String(o.value) === String(r[f.name]))?.label : r[f.name]) ?? '—') })),
                        { key: 'actions', label: '', render: (r: Row) => (<div className="flex justify-end gap-1"><Button size="sm" variant="ghost" aria-label={t('Edit')} onClick={() => setEditing(r)}><Pencil className="size-4" /></Button><ConfirmAction href={route('admin.reference.destroy', [resource, r.id])} method="delete" title={t('Delete this record?')} description={t('Records used by cases cannot be deleted.')} trigger={(open) => <Button size="sm" variant="ghost" aria-label={t('Delete')} onClick={open}><Trash2 className="size-4" /></Button>} /></div>) }]} />
            </Card>
            {editing !== undefined && <EditDialog key={editing?.id ?? 'new'} resource={resource} fields={fields} row={editing} onClose={() => setEditing(undefined)} />}
        </AppLayout>
    );
}

function EditDialog({ resource, fields, row, onClose }: { resource: string; fields: Field[]; row: Row | null; onClose: () => void }) {
    const t = useT();
    const form = useForm(Object.fromEntries(fields.map((f) => [f.name, f.type === 'boolean' ? (row ? !!row[f.name] : true) : row?.[f.name] ?? ''])) as Record<string, string | boolean>);
    function submit() {
        form.transform((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v === '' ? null : v])));
        const opts = { preserveScroll: true, onSuccess: onClose };
        row ? form.put(route('admin.reference.update', [resource, row.id]), opts) : form.post(route('admin.reference.store', resource), opts);
    }
    return (
        <Modal open onClose={onClose} title={row ? t('Edit') : t('Add')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={submit}>{t('Save')}</Button></>}>
            <div className="space-y-4">
                {fields.map((f) => {
                    const err = (form.errors as Record<string, string>)[f.name];
                    if (f.type === 'boolean') return <Checkbox key={f.name} label={f.label} checked={!!form.data[f.name]} onChange={(e) => form.setData(f.name, e.target.checked)} />;
                    if (f.type === 'select') return <Select key={f.name} label={f.label} value={String(form.data[f.name] ?? '')} onChange={(e) => form.setData(f.name, e.target.value)} options={f.options ?? []} placeholder="—" error={err} />;
                    if (f.type === 'textarea') return <Textarea key={f.name} label={f.label} value={String(form.data[f.name] ?? '')} onChange={(e) => form.setData(f.name, e.target.value)} error={err} dir={f.name.endsWith('_ur') ? 'rtl' : undefined} />;
                    return <Input key={f.name} label={f.label} type={f.type === 'number' ? 'number' : 'text'} value={String(form.data[f.name] ?? '')} onChange={(e) => form.setData(f.name, e.target.value)} error={err} dir={f.name.endsWith('_ur') ? 'rtl' : undefined} />;
                })}
            </div>
        </Modal>
    );
}
