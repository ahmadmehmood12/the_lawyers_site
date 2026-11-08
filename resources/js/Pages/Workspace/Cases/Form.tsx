import { useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button, Card, CardBody, CardHeader, Checkbox, Input, LinkButton, PageHeader, Select, Textarea } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { Option } from '@/types';
import type { SelectOption } from '@/types/domain';

type Party = { role: string; name: string; father_name: string; address: string; counsel_name: string; is_our_side: boolean };
type Options = { types: Option[]; statuses: Option[]; priorities: Option[]; partyRoles: Option[]; courts: SelectOption[]; judges: SelectOption[]; specializations: SelectOption[]; provinces: SelectOption[]; districts: SelectOption[]; clients: SelectOption[]; lawyers: SelectOption[] };

export default function CaseForm({ legalCase, preselectedClientId, options }: { legalCase: Record<string, any> | null; preselectedClientId: number | null; options: Options }) {
    const t = useT();
    const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
    const form = useForm({
        title: s(legalCase?.title), case_number: s(legalCase?.case_number), case_type: legalCase?.case_type ?? 'civil', specialization_id: s(legalCase?.specialization_id),
        description: s(legalCase?.description), filing_date: s(legalCase?.filing_date), court_id: s(legalCase?.court_id), jurisdiction: s(legalCase?.jurisdiction),
        province_id: s(legalCase?.province_id), district_id: s(legalCase?.district_id), judge_id: s(legalCase?.judge_id), judge_name: s(legalCase?.judge_name), courtroom: s(legalCase?.courtroom),
        status: legalCase?.status ?? 'filed', stage: s(legalCase?.stage), priority: legalCase?.priority ?? 'normal', professional_fee: s(legalCase?.professional_fee), fee_type: s(legalCase?.fee_type),
        fir_number: s(legalCase?.fir_number), police_station: s(legalCase?.police_station), fir_date: s(legalCase?.fir_date), legal_sections: s(legalCase?.legal_sections), bail_status: s(legalCase?.bail_status),
        investigation_notes: s(legalCase?.investigation_notes), strategy_notes: s(legalCase?.strategy_notes), client_summary: s(legalCase?.client_summary), share_with_client: legalCase?.share_with_client ?? true,
        client_ids: (legalCase?.client_ids ?? (preselectedClientId ? [preselectedClientId] : [])).map(String) as string[],
        lawyer_ids: [] as string[], lead_lawyer_id: '',
        parties: (legalCase?.parties ?? []) as Party[],
    });
    const judges = options.judges.filter((j) => String(j.court_id) === form.data.court_id);
    const districts = options.districts.filter((d) => !form.data.province_id || String(d.province_id) === form.data.province_id);
    const isCriminal = form.data.case_type === 'criminal';
    const set = (key: keyof typeof form.data) => (e: { target: { value: string } }) => form.setData(key, e.target.value as never);
    const err = (key: string) => (form.errors as Record<string, string>)[key];

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((d) => {
            const payload: Record<string, unknown> = { ...d, client_ids: d.client_ids.map(Number), lawyer_ids: d.lawyer_ids.map(Number) };
            if (!d.lawyer_ids.length) { delete payload.lawyer_ids; delete payload.lead_lawyer_id; } else payload.lead_lawyer_id = Number(d.lead_lawyer_id || d.lawyer_ids[0]);
            for (const k of ['specialization_id', 'court_id', 'province_id', 'district_id', 'judge_id', 'professional_fee', 'filing_date', 'fir_date', 'fee_type', 'jurisdiction', 'bail_status']) if (payload[k] === '') payload[k] = null;
            return payload;
        });
        legalCase?.id ? form.put(route('cases.update', legalCase.id)) : form.post(route('cases.store'));
    }

    const updateParty = (index: number, patch: Partial<Party>) => form.setData('parties', form.data.parties.map((p, i) => (i === index ? { ...p, ...patch } : p)));

    return (
        <AppLayout title={legalCase ? t('Edit case') : t('New case')}>
            <PageHeader title={legalCase ? t('Edit case') : t('New case')} breadcrumbs={[{ label: t('Cases'), href: route('cases.index') }, { label: legalCase?.reference ?? t('New') }]} />
            <form onSubmit={submit} className="space-y-6">
                <Card>
                    <CardHeader title={t('Case details')} />
                    <CardBody className="grid gap-4 md:grid-cols-3">
                        <Input wrapperClassName="md:col-span-2" label={t('Case title')} placeholder={t('e.g. Ahmed vs. Khan — suit for recovery')} value={form.data.title} onChange={set('title')} error={err('title')} required />
                        <Input label={t('Court case number')} value={form.data.case_number} onChange={set('case_number')} error={err('case_number')} className="ltr-nums" />
                        <Select label={t('Case type')} value={form.data.case_type} onChange={set('case_type')} options={options.types} />
                        <Select label={t('Practice area')} value={form.data.specialization_id} onChange={set('specialization_id')} options={options.specializations} placeholder={t('Select')} />
                        <Select label={t('Status')} value={form.data.status} onChange={set('status')} options={options.statuses} />
                        <Input label={t('Stage')} value={form.data.stage} onChange={set('stage')} placeholder={t('e.g. Framing of issues')} />
                        <Select label={t('Priority')} value={form.data.priority} onChange={set('priority')} options={options.priorities} />
                        <Input label={t('Filing date')} type="date" value={form.data.filing_date} onChange={set('filing_date')} error={err('filing_date')} />
                        <Textarea wrapperClassName="md:col-span-3" label={t('Description')} rows={3} value={form.data.description} onChange={set('description')} />
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title={t('Clients')} description={t('Select one or more clients. The first is the primary client.')} />
                    <CardBody>
                        <div className="flex flex-wrap gap-2">
                            {options.clients.length === 0 && <p className="text-sm text-navy-500">{t('No clients yet.')} <LinkButton href={route('clients.create')} variant="ghost" size="sm">{t('Add a client')}</LinkButton></p>}
                            {options.clients.map((c) => {
                                const selected = form.data.client_ids.includes(String(c.value));
                                return (
                                    <button key={c.value} type="button" onClick={() => form.setData('client_ids', selected ? form.data.client_ids.filter((id) => id !== String(c.value)) : [...form.data.client_ids, String(c.value)])}
                                        className={`rounded-full px-3 py-1.5 text-sm ring-1 ring-inset ${selected ? 'bg-navy-900 text-white ring-navy-900 dark:bg-gold-500 dark:text-navy-950' : 'ring-navy-200 hover:bg-navy-50 dark:ring-navy-700 dark:hover:bg-navy-800'}`}>
                                        {c.label}
                                    </button>
                                );
                            })}
                        </div>
                        {err('client_ids') && <p className="mt-2 text-xs text-red-600">{err('client_ids')}</p>}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title={t('Court & jurisdiction')} />
                    <CardBody className="grid gap-4 md:grid-cols-3">
                        <Select label={t('Court')} value={form.data.court_id} onChange={(e) => form.setData((d) => ({ ...d, court_id: e.target.value, judge_id: '' }))} options={options.courts} placeholder={t('Select court')} />
                        {judges.length > 0 ? (
                            <Select label={t('Judge')} value={form.data.judge_id} onChange={set('judge_id')} options={judges} placeholder={t('Select judge')} />
                        ) : (
                            <Input label={t('Judge')} value={form.data.judge_name} onChange={set('judge_name')} />
                        )}
                        <Input label={t('Courtroom')} value={form.data.courtroom} onChange={set('courtroom')} />
                        <Select label={t('Jurisdiction')} value={form.data.jurisdiction} onChange={set('jurisdiction')} placeholder={t('Select')} options={[{ value: 'original', label: t('Original') }, { value: 'appellate', label: t('Appellate') }, { value: 'revisional', label: t('Revisional') }, { value: 'writ', label: t('Writ') }, { value: 'execution', label: t('Execution') }]} />
                        <Select label={t('Province')} value={form.data.province_id} onChange={(e) => form.setData((d) => ({ ...d, province_id: e.target.value, district_id: '' }))} options={options.provinces} placeholder={t('Select')} />
                        <Select label={t('District')} value={form.data.district_id} onChange={set('district_id')} options={districts} placeholder={t('Select')} />
                    </CardBody>
                </Card>

                {isCriminal && (
                    <Card>
                        <CardHeader title={t('FIR & criminal details')} />
                        <CardBody className="grid gap-4 md:grid-cols-3">
                            <Input label={t('FIR number')} value={form.data.fir_number} onChange={set('fir_number')} error={err('fir_number')} className="ltr-nums" />
                            <Input label={t('Police station')} value={form.data.police_station} onChange={set('police_station')} />
                            <Input label={t('FIR date')} type="date" value={form.data.fir_date} onChange={set('fir_date')} error={err('fir_date')} />
                            <Input label={t('Sections')} value={form.data.legal_sections} onChange={set('legal_sections')} placeholder="302, 34 PPC" />
                            <Select label={t('Bail status')} value={form.data.bail_status} onChange={set('bail_status')} placeholder={t('Select')} options={['not_applicable', 'not_applied', 'applied', 'pre_arrest_granted', 'post_arrest_granted', 'refused', 'cancelled'].map((v) => ({ value: v, label: t(`bail.${v}`) }))} />
                            <Textarea wrapperClassName="md:col-span-3" label={t('Investigation notes')} hint={t('Encrypted. Internal only.')} rows={3} value={form.data.investigation_notes} onChange={set('investigation_notes')} />
                        </CardBody>
                    </Card>
                )}

                <Card>
                    <CardHeader title={t('Parties')} actions={<Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => form.setData('parties', [...form.data.parties, { role: 'plaintiff', name: '', father_name: '', address: '', counsel_name: '', is_our_side: form.data.parties.length === 0 }])}>{t('Add party')}</Button>} />
                    <CardBody className="space-y-3">
                        {form.data.parties.length === 0 && <p className="text-sm text-navy-500">{t('Add plaintiffs, defendants, applicants or respondents.')}</p>}
                        {form.data.parties.map((party, index) => (
                            <div key={index} className="grid gap-3 rounded-lg border border-navy-100 p-3 md:grid-cols-6 dark:border-navy-800">
                                <Select label={t('Role')} value={party.role} onChange={(e) => updateParty(index, { role: e.target.value })} options={options.partyRoles} />
                                <Input wrapperClassName="md:col-span-2" label={t('Name')} value={party.name} onChange={(e) => updateParty(index, { name: e.target.value })} error={err(`parties.${index}.name`)} />
                                <Input label={t('Father / husband')} value={party.father_name} onChange={(e) => updateParty(index, { father_name: e.target.value })} />
                                <Input label={t('Counsel')} value={party.counsel_name} onChange={(e) => updateParty(index, { counsel_name: e.target.value })} />
                                <div className="flex items-end justify-between gap-2">
                                    <Checkbox label={t('Our side')} checked={party.is_our_side} onChange={(e) => updateParty(index, { is_our_side: e.target.checked })} />
                                    <Button variant="ghost" size="sm" aria-label={t('Remove')} onClick={() => form.setData('parties', form.data.parties.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </CardBody>
                </Card>

                {!legalCase && options.lawyers.length > 1 && (
                    <Card>
                        <CardHeader title={t('Case team')} description={t('Leave empty to assign yourself.')} />
                        <CardBody className="grid gap-4 md:grid-cols-2">
                            <div className="flex flex-wrap gap-2">
                                {options.lawyers.map((l) => {
                                    const selected = form.data.lawyer_ids.includes(String(l.value));
                                    return <Checkbox key={l.value} label={l.label} checked={selected} onChange={() => form.setData('lawyer_ids', selected ? form.data.lawyer_ids.filter((id) => id !== String(l.value)) : [...form.data.lawyer_ids, String(l.value)])} />;
                                })}
                            </div>
                            {form.data.lawyer_ids.length > 0 && <Select label={t('Lead lawyer')} value={form.data.lead_lawyer_id} onChange={set('lead_lawyer_id')} options={options.lawyers.filter((l) => form.data.lawyer_ids.includes(String(l.value)))} />}
                        </CardBody>
                    </Card>
                )}

                <Card>
                    <CardHeader title={t('Fees & client sharing')} />
                    <CardBody className="grid gap-4 md:grid-cols-3">
                        <Input label={t('Professional fee (PKR)')} type="number" min={0} value={form.data.professional_fee} onChange={set('professional_fee')} error={err('professional_fee')} />
                        <Select label={t('Fee arrangement')} value={form.data.fee_type} onChange={set('fee_type')} placeholder={t('Select')} options={[{ value: 'fixed', label: t('Fixed') }, { value: 'installments', label: t('Installments') }, { value: 'per_hearing', label: t('Per hearing') }, { value: 'retainer', label: t('Retainer') }]} />
                        <div className="flex items-end"><Checkbox label={t('Share case progress with the client')} checked={form.data.share_with_client} onChange={(e) => form.setData('share_with_client', e.target.checked)} /></div>
                        <Textarea wrapperClassName="md:col-span-3" label={t('Progress summary for the client')} hint={t('Visible in the client portal.')} rows={2} value={form.data.client_summary} onChange={set('client_summary')} />
                        <Textarea wrapperClassName="md:col-span-3" label={t('Strategy notes')} hint={t('Encrypted. Never visible to clients.')} rows={3} value={form.data.strategy_notes} onChange={set('strategy_notes')} />
                    </CardBody>
                </Card>

                <div className="sticky bottom-16 z-10 flex justify-end gap-2 rounded-lg bg-white/90 p-3 shadow-card backdrop-blur lg:bottom-4 dark:bg-navy-900/90">
                    <LinkButton href={legalCase?.id ? route('cases.show', legalCase.id) : route('cases.index')} variant="secondary">{t('Cancel')}</LinkButton>
                    <Button type="submit" loading={form.processing}>{legalCase ? t('Save changes') : t('Create case')}</Button>
                </div>
            </form>
        </AppLayout>
    );
}
