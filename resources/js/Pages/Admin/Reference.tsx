import { Link, router, useForm } from '@inertiajs/react';
import { ArrowLeftRight, Building, Gavel, History, Landmark, Layers, Map as MapIcon, MapPin, MapPinned, Pencil, Plus, Repeat2, Scale, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Alert, Badge, Button, Card, Checkbox, ConfirmAction, DataTable, Input, Modal, PageHeader, Select, Textarea } from '@/Components/ui';
import { formatDate } from '@/lib/format';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { useLocale, useT } from '@/lib/i18n';
import type { Paginated } from '@/types';

type Field = { name: string; label: string; type: 'text' | 'textarea' | 'number' | 'boolean' | 'select'; options?: { value: string | number; label: string }[] };
type Row = Record<string, any> & { id: number; _display: Record<string, string> };
type Kpi = { key: string; label: string; total: number; active: number | null };
type Opt = { value: number; label: string; district_id?: number | null };
type Move = { id: number; kind: 'transfer' | 'swap'; effective_on: string; note: string | null; swapped_with: string | null; from: string; to: string };
type JudgeTools = { courts: Opt[]; districts: Opt[]; tehsils: Opt[]; judges: { value: number; label: string; posting: string; courtroom: string | null }[]; history: Record<string, Move[]> };

const kpiIcons: Record<string, typeof Landmark> = { courts: Landmark, judges: Gavel, specializations: Tags, provinces: MapIcon, districts: MapPinned, cities: Building, tehsils: MapPin, 'court-types': Layers, 'bar-councils': Scale };

export default function Reference({ resource, resources, kpis, label, fields, rows, filters, judgeTools = null }: { resource: string; resources: { key: string; label: string }[]; kpis: Kpi[]; label: string; fields: Field[]; rows: Paginated<Row>; filters: Record<string, string>; judgeTools?: JudgeTools | null }) {
    const t = useT();
    const [editing, setEditing] = useState<Row | null | undefined>(undefined);
    const [transferring, setTransferring] = useState<Row | null>(null);
    const [swapping, setSwapping] = useState<number | null | undefined>(undefined);
    const listed = fields.filter((f) => f.type !== 'textarea').slice(0, judgeTools ? 5 : 4);
    return (
        <AppLayout title={label} area="admin" wide>
            <PageHeader title={label} description={t('Reference data used across case files, the directory and the court diary.')} actions={<div className="flex flex-wrap gap-2">
                    {judgeTools && <Button variant="secondary" icon={<Repeat2 className="size-4" />} onClick={() => setSwapping(null)}>{t('Swap two judges')}</Button>}
                    <Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>{t('Add')}</Button>
                </div>} />
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
                        { key: 'actions', label: '', render: (r: Row) => (<div className="flex justify-end gap-1">{judgeTools && <><Button size="sm" variant="secondary" icon={<ArrowLeftRight className="size-4" />} onClick={() => setTransferring(r)}>{t('Transfer')}</Button><Button size="sm" variant="ghost" aria-label={t('Swap with another judge')} title={t('Swap with another judge')} onClick={() => setSwapping(r.id)}><Repeat2 className="size-4" /></Button></>}<Button size="sm" variant="ghost" aria-label={t('Edit')} onClick={() => setEditing(r)}><Pencil className="size-4" /></Button><ConfirmAction href={route('admin.reference.destroy', [resource, r.id])} method="delete" title={t('Delete this record?')} description={t('Records used by cases cannot be deleted.')} trigger={(open) => <Button size="sm" variant="ghost" aria-label={t('Delete')} onClick={open}><Trash2 className="size-4" /></Button>} /></div>) }]} />
            </Card>
            {judgeTools && transferring && <TransferDialog key={transferring.id} judge={transferring} tools={judgeTools} onClose={() => setTransferring(null)} />}
            {judgeTools && swapping !== undefined && <SwapDialog firstId={swapping} tools={judgeTools} onClose={() => setSwapping(undefined)} />}
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

const today = () => new Date().toISOString().slice(0, 10);

/** Transfer one judge: new court, district (follows the court), optional tehsil and courtroom, with the order date. */
function TransferDialog({ judge, tools, onClose }: { judge: Row; tools: JudgeTools; onClose: () => void }) {
    const t = useT();
    const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
    const form = useForm({ court_id: s(judge.court_id), district_id: s(judge.district_id), tehsil_id: s(judge.tehsil_id), courtroom: s(judge.courtroom), designation: '', effective_on: today(), note: '' });
    const current = tools.judges.find((j) => j.value === judge.id);
    const tehsils = tools.tehsils.filter((x) => String(x.district_id) === form.data.district_id);
    function chooseCourt(value: string) {
        const court = tools.courts.find((c) => String(c.value) === value);
        form.setData((d) => {
            const district = court?.district_id ? String(court.district_id) : d.district_id;
            return { ...d, court_id: value, district_id: district, tehsil_id: district === d.district_id ? d.tehsil_id : '' };
        });
    }
    function submit() {
        form.transform((d) => ({ ...d, tehsil_id: d.tehsil_id || null, courtroom: d.courtroom || null, designation: d.designation || null, note: d.note || null }));
        form.post(route('admin.judges.transfer', judge.id), { preserveScroll: true, onSuccess: onClose });
    }
    return (
        <Modal open onClose={onClose} size="lg" title={t('Transfer :name', { name: String(judge.name) })}
            footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} icon={<ArrowLeftRight className="size-4" />} onClick={submit}>{t('Transfer judge')}</Button></>}>
            <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded border border-navy-200 bg-navy-50 p-3 dark:border-navy-700 dark:bg-navy-800/60">
                        <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">{t('Now posted at')}</p>
                        <p className="mt-1 text-sm font-medium">{current?.posting ?? '—'}</p>
                        {current?.courtroom && <p className="text-xs text-navy-500">{t('Courtroom')} {current.courtroom}</p>}
                    </div>
                    <div className="rounded border border-navy-900 bg-navy-900 p-3 text-white dark:border-gold-500 dark:bg-gold-500/15">
                        <p className="text-xs font-semibold uppercase tracking-wide text-navy-200 dark:text-gold-300">{t('Will be posted at')}</p>
                        <p className="mt-1 text-sm font-medium">{[tools.courts.find((c) => String(c.value) === form.data.court_id)?.label, tehsils.find((x) => String(x.value) === form.data.tehsil_id)?.label, tools.districts.find((d) => String(d.value) === form.data.district_id)?.label].filter(Boolean).join(', ') || '—'}</p>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Select wrapperClassName="sm:col-span-2" label={t('Court')} value={form.data.court_id} onChange={(e) => chooseCourt(e.target.value)} options={tools.courts} error={form.errors.court_id} required />
                    <Select label={t('District')} value={form.data.district_id} onChange={(e) => form.setData((d) => ({ ...d, district_id: e.target.value, tehsil_id: '' }))} options={tools.districts} error={form.errors.district_id} hint={t('Filled from the court; change it if needed.')} required />
                    <Select label={t('Tehsil')} value={form.data.tehsil_id} onChange={(e) => form.setData('tehsil_id', e.target.value)} options={tehsils} placeholder={t('Optional')} disabled={!form.data.district_id} error={form.errors.tehsil_id} />
                    <Input label={t('Courtroom')} value={form.data.courtroom} onChange={(e) => form.setData('courtroom', e.target.value)} error={form.errors.courtroom} />
                    <Input label={t('New designation')} value={form.data.designation} onChange={(e) => form.setData('designation', e.target.value)} placeholder={String(judge.designation ?? '')} hint={t('Only if it changes with the transfer.')} />
                    <Input label={t('Effective from')} type="date" value={form.data.effective_on} onChange={(e) => form.setData('effective_on', e.target.value)} error={form.errors.effective_on} required />
                    <Input label={t('Order or note')} value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} placeholder={t('e.g. LHC notification No. 123')} error={form.errors.note} />
                </div>
                <MoveHistory moves={tools.history[String(judge.id)] ?? []} />
            </div>
        </Modal>
    );
}

/** Two judges exchange postings (court, district, tehsil and courtroom). */
function SwapDialog({ firstId, tools, onClose }: { firstId: number | null; tools: JudgeTools; onClose: () => void }) {
    const t = useT();
    const form = useForm({ first_id: firstId ? String(firstId) : '', second_id: '', effective_on: today(), note: '' });
    const first = tools.judges.find((j) => String(j.value) === form.data.first_id);
    const second = tools.judges.find((j) => String(j.value) === form.data.second_id);
    const side = (judge: typeof first, other: typeof first) => (
        <div className="rounded border border-navy-200 p-3 dark:border-navy-700">
            <p className="font-semibold">{judge?.label ?? '—'}</p>
            <p className="mt-2 text-xs text-navy-500">{t('From')}</p>
            <p className="text-sm line-through decoration-navy-300">{judge?.posting ?? '—'}</p>
            <p className="mt-1 text-xs text-navy-500">{t('To')}</p>
            <p className="text-sm font-medium text-verdant-700 dark:text-verdant-300">{other?.posting ?? '—'}{other?.courtroom ? `, ${t('Courtroom')} ${other.courtroom}` : ''}</p>
        </div>
    );
    return (
        <Modal open onClose={onClose} size="lg" title={t('Swap two judges')}
            footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} disabled={!first || !second} icon={<Repeat2 className="size-4" />} onClick={() => form.post(route('admin.judges.swap'), { preserveScroll: true, onSuccess: onClose })}>{t('Swap postings')}</Button></>}>
            <div className="space-y-4">
                <p className="text-sm text-navy-600 dark:text-navy-300">{t('Each judge takes the other’s court, district, tehsil and courtroom. Both moves are saved in their history.')}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Select label={t('First judge')} value={form.data.first_id} onChange={(e) => form.setData('first_id', e.target.value)} options={tools.judges} placeholder={t('Select')} error={form.errors.first_id} required />
                    <Select label={t('Second judge')} value={form.data.second_id} onChange={(e) => form.setData('second_id', e.target.value)} options={tools.judges.filter((j) => String(j.value) !== form.data.first_id)} placeholder={t('Select')} error={form.errors.second_id} required />
                </div>
                {first && second && <div className="grid gap-3 sm:grid-cols-2">{side(first, second)}{side(second, first)}</div>}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label={t('Effective from')} type="date" value={form.data.effective_on} onChange={(e) => form.setData('effective_on', e.target.value)} error={form.errors.effective_on} required />
                    <Input label={t('Order or note')} value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} placeholder={t('e.g. LHC notification No. 123')} error={form.errors.note} />
                </div>
                <Alert tone="info">{t('Cases keep the judge already saved on them. Update a case’s judge from the case if the bench changed.')}</Alert>
            </div>
        </Modal>
    );
}

function MoveHistory({ moves }: { moves: Move[] }) {
    const t = useT();
    const { locale } = useLocale();
    if (moves.length === 0) return null;
    return (
        <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><History className="size-4" />{t('Posting history')}</p>
            <ol className="space-y-2 border-s-2 border-navy-200 ps-4 dark:border-navy-700">
                {moves.map((m) => (
                    <li key={m.id} className="text-sm">
                        <p className="flex flex-wrap items-center gap-2"><span className="font-medium">{formatDate(m.effective_on, locale)}</span><Badge tone={m.kind === 'swap' ? 'gold' : 'navy'}>{m.kind === 'swap' ? t('Swapped with :name', { name: m.swapped_with ?? '—' }) : t('Transfer')}</Badge></p>
                        <p className="text-navy-600 dark:text-navy-300">{m.from} → {m.to}</p>
                        {m.note && <p className="text-xs text-navy-500">{m.note}</p>}
                    </li>
                ))}
            </ol>
        </div>
    );
}
