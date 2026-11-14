import { Link, router, useForm } from '@inertiajs/react';
import { Archive, CalendarPlus, CheckCircle2, Circle, Download, Eye, EyeOff, FilePlus2, FileSignature, Lock, MessageSquare, Pencil, Plus, Receipt, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { DocumentUploadDialog } from '@/Components/domain/DocumentUploadDialog';
import { CancelHearingDialog, OutcomeDialog, RescheduleDialog, ScheduleHearingDialog } from '@/Components/domain/HearingDialogs';
import { TaskDialog } from '@/Components/domain/TaskDialog';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, ConfirmAction, DetailList, EmptyState, Input, LinkButton, Modal, PageHeader, Select, Skeleton, StatusBadge, Tabs } from '@/Components/ui';
import { CaseTimeTab } from '@/Components/domain/CaseTime';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatBytes, formatDate, formatDateTime, formatMoney, formatTime, todayIso } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option } from '@/types';
import type { HearingSummary, SelectOption, TaskItem } from '@/types/domain';

type CaseData = Record<string, any> & {
    id: number; reference: string; title: string; status: string; status_label: string; priority: string; priority_label: string; is_criminal: boolean;
    clients: { id: number; name: string; phone: string | null; is_primary: boolean; has_portal: boolean }[];
    lawyers: { id: number; name: string; role: string }[];
    next_hearing: HearingSummary | null;
};
type Props = {
    tab: string;
    legalCase: CaseData;
    section?: Record<string, any> | null;
    counts: { hearings: number; documents: number; tasks: number };
    can: Record<string, boolean>;
    options: { hearingTypes: Option[]; attendance: Option[]; courts: SelectOption[]; judges: SelectOption[]; lawyers: SelectOption[]; members: SelectOption[]; priorities: Option[]; documentCategories: Option[]; taskStatuses: Option[] };
};

export default function CaseShow({ tab, legalCase: c, section, counts, can, options }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const [schedule, setSchedule] = useState(false);
    const [outcome, setOutcome] = useState<HearingSummary | null>(null);
    const [reschedule, setReschedule] = useState<HearingSummary | null>(null);
    const [cancel, setCancel] = useState<HearingSummary | null>(null);
    const [upload, setUpload] = useState(false);
    const [task, setTask] = useState<TaskItem | null | undefined>(undefined);
    const [team, setTeam] = useState(false);
    const hearingOptions = { ...options, courts: options.courts, judges: options.judges, lawyers: options.lawyers };
    const tabHref = (key: string) => route('cases.show', { case: c.id, tab: key });

    const tabs = [
        { key: 'overview', label: t('Overview') },
        { key: 'parties', label: t('Parties') },
        { key: 'hearings', label: t('Hearings & diary'), count: counts.hearings },
        { key: 'documents', label: t('Documents'), count: counts.documents, hidden: !can.viewDocuments },
        { key: 'tasks', label: t('Tasks'), count: counts.tasks },
        { key: 'time', label: t('Time') },
        { key: 'finance', label: t('Fees & expenses') },
        { key: 'communications', label: t('Communications') },
        { key: 'timeline', label: t('Timeline') },
        { key: 'audit', label: t('Audit') },
    ].map((x) => ({ ...x, href: tabHref(x.key) }));

    return (
        <AppLayout title={c.title} wide>
            <PageHeader
                title={c.title}
                breadcrumbs={[{ label: t('Cases'), href: route('cases.index') }, { label: c.reference }]}
                description={
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="ltr-nums">{c.reference}{c.case_number ? `, ${c.case_number}` : ''}</span>
                        <StatusBadge value={c.status} label={c.status_label} />
                        {['high', 'urgent'].includes(c.priority) && <StatusBadge value={c.priority} label={c.priority_label} />}
                        <Badge>{c.case_type_label}</Badge>
                        {!c.share_with_client && <Badge icon={<EyeOff className="size-3" />}>{t('Hidden from client')}</Badge>}
                    </span>
                }
                actions={
                    <>
                        {can.manageHearings && <Button icon={<CalendarPlus className="size-4" />} onClick={() => setSchedule(true)}>{t('Schedule hearing')}</Button>}
                        {can.update && <LinkButton href={route('cases.edit', c.id)} variant="secondary" icon={<Pencil className="size-4" />}>{t('Edit')}</LinkButton>}
                        {can.archive && c.status !== 'archived' && (
                            <ConfirmAction href={route('cases.archive', c.id)} title={t('Archive this case?')} description={t('The case is closed and moved to the archive. Hearings, documents and financial history are kept.')} confirmLabel={t('Archive')} trigger={(open) => <Button variant="ghost" icon={<Archive className="size-4" />} onClick={open} aria-label={t('Archive')} />} />
                        )}
                    </>
                }
            />

            {c.next_hearing && (
                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-gold-200 bg-gold-50 px-4 py-2.5 text-sm text-gold-700 dark:border-gold-700/40 dark:bg-gold-700/10 dark:text-gold-200">
                    <span className="font-semibold">{t('Next hearing')}:</span>
                    <span>{formatDate(c.next_hearing.hearing_date, locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{c.next_hearing.hearing_time ? `, ${formatTime(c.next_hearing.hearing_time, locale)}` : ''}</span>
                    {c.next_hearing.purpose && <span>{c.next_hearing.purpose}</span>}
                    {c.next_hearing.court && <span className="opacity-80">{c.next_hearing.court}</span>}
                </div>
            )}

            <Tabs tabs={tabs} active={tab} className="mb-5" />

            {section === undefined ? (
                <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
            ) : (
                <>
                    {tab === 'overview' && <Overview c={c} can={can} onTeam={() => setTeam(true)} />}
                    {tab === 'parties' && <Parties parties={section?.parties ?? []} canEdit={can.update} caseId={c.id} />}
                    {tab === 'hearings' && (
                        <Hearings
                            hearings={section?.hearings ?? []}
                            diary={section?.diary ?? []}
                            caseId={c.id}
                            can={can}
                            onOutcome={setOutcome}
                            onReschedule={setReschedule}
                            onCancel={setCancel}
                            onSchedule={() => setSchedule(true)}
                        />
                    )}
                    {tab === 'documents' && section && <Documents documents={section.documents} drafts={section.drafts} can={can} caseId={c.id} onUpload={() => setUpload(true)} />}
                    {tab === 'tasks' && <Tasks tasks={section?.tasks ?? []} can={can} onEdit={setTask} />}
                    {tab === 'time' && section?.time && <CaseTimeTab caseId={c.id} data={section.time} />}
                    {tab === 'finance' && <Finance data={section ?? {}} c={c} can={can} />}
                    {tab === 'communications' && <Communications data={section ?? {}} c={c} can={can} />}
                    {tab === 'timeline' && <Timeline events={section?.events ?? []} />}
                    {tab === 'audit' && <Audit activities={section?.activities ?? []} />}
                </>
            )}

            <ScheduleHearingDialog open={schedule} onClose={() => setSchedule(false)} caseId={c.id} defaults={{ court_id: c.court_id }} options={hearingOptions} />
            <OutcomeDialog hearing={outcome && { ...outcome, case: { id: c.id, title: c.title, reference: c.reference } }} onClose={() => setOutcome(null)} options={hearingOptions} canUpload={can.uploadDocuments} />
            <RescheduleDialog hearing={reschedule} onClose={() => setReschedule(null)} />
            <CancelHearingDialog hearing={cancel} onClose={() => setCancel(null)} />
            {can.uploadDocuments && <DocumentUploadDialog open={upload} onClose={() => setUpload(false)} categories={options.documentCategories} caseId={c.id} />}
            <TaskDialog open={task !== undefined} onClose={() => setTask(undefined)} task={task} caseId={c.id} members={options.members} priorities={options.priorities} statuses={options.taskStatuses} />
            {can.assign && <TeamDialog open={team} onClose={() => setTeam(false)} c={c} lawyers={options.lawyers} />}
        </AppLayout>
    );
}

function Overview({ c, can, onTeam }: { c: CaseData; can: Record<string, boolean>; onTeam: () => void }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
                <Card>
                    <CardHeader title={t('Case information')} />
                    <CardBody>
                        <DetailList
                            columns={3}
                            items={[
                                { label: t('Court'), value: c.court },
                                { label: t('Judge'), value: c.judge },
                                { label: t('Courtroom'), value: c.courtroom },
                                { label: t('Jurisdiction'), value: c.jurisdiction && t(c.jurisdiction.charAt(0).toUpperCase() + c.jurisdiction.slice(1)) },
                                { label: t('District'), value: [c.district, c.province].filter(Boolean).join(', ') },
                                { label: t('Practice area'), value: c.specialization },
                                { label: t('Filing date'), value: c.filing_date && formatDate(c.filing_date, locale) },
                                { label: t('Filing year'), value: c.filing_year },
                                { label: t('Stage'), value: c.stage },
                            ]}
                        />
                        {c.description && <p className="mt-5 border-t border-navy-100 pt-4 text-sm whitespace-pre-line dark:border-navy-800">{c.description}</p>}
                    </CardBody>
                </Card>
                {c.is_criminal && (
                    <Card>
                        <CardHeader title={t('FIR & criminal details')} />
                        <CardBody>
                            <DetailList columns={3} items={[
                                { label: t('FIR number'), value: <span className="ltr-nums">{c.fir_number}</span> },
                                { label: t('FIR date'), value: c.fir_date && formatDate(c.fir_date, locale) },
                                { label: t('Police station'), value: c.police_station },
                                { label: t('Sections'), value: c.legal_sections },
                                { label: t('Bail status'), value: c.bail_status && t(`bail.${c.bail_status}`) },
                            ]} />
                            {c.investigation_notes && <div className="mt-4 rounded-lg bg-navy-50 p-3 text-sm dark:bg-navy-800"><p className="mb-1 flex items-center gap-1 text-xs font-semibold text-navy-500"><Lock className="size-3" />{t('Investigation notes')}</p><p className="whitespace-pre-line">{c.investigation_notes}</p></div>}
                        </CardBody>
                    </Card>
                )}
                {c.strategy_notes && (
                    <Card>
                        <CardHeader title={<span className="flex items-center gap-1.5"><Lock className="size-4" />{t('Strategy notes')}</span>} description={t('Internal — never shown to clients.')} />
                        <CardBody><p className="text-sm whitespace-pre-line">{c.strategy_notes}</p></CardBody>
                    </Card>
                )}
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader title={t('Clients')} />
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {c.clients.map((client) => (
                            <li key={client.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                                <Link href={route('clients.show', client.id)} className="font-medium hover:underline">{client.name}</Link>
                                <span className="flex gap-1">{client.is_primary && <Badge tone="navy">{t('Primary')}</Badge>}{client.has_portal && <Badge tone="green">{t('Portal')}</Badge>}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
                <Card>
                    <CardHeader title={t('Case team')} actions={can.assign && <Button size="sm" variant="ghost" icon={<Users className="size-4" />} onClick={onTeam}>{t('Manage')}</Button>} />
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {c.lawyers.map((l) => (
                            <li key={l.id} className="flex items-center justify-between px-5 py-3 text-sm"><span>{l.name}</span>{l.role === 'lead' && <Badge tone="gold">{t('Lead')}</Badge>}</li>
                        ))}
                    </ul>
                </Card>
                <Card>
                    <CardHeader title={t('Client portal view')} />
                    <CardBody className="space-y-2 text-sm">
                        <p className="flex items-center gap-2">{c.share_with_client ? <Eye className="size-4 text-verdant-600" /> : <EyeOff className="size-4 text-navy-400" />}{c.share_with_client ? t('Progress is shared with the client.') : t('This case is hidden from the client.')}</p>
                        {c.client_summary && <p className="rounded-lg bg-navy-50 p-3 dark:bg-navy-800">{c.client_summary}</p>}
                    </CardBody>
                </Card>
                {c.professional_fee && (
                    <Card><CardBody><DetailList columns={1} items={[{ label: t('Professional fee'), value: formatMoney(c.professional_fee, locale) }, { label: t('Fee arrangement'), value: c.fee_type && t(c.fee_type === 'per_hearing' ? 'Per hearing' : c.fee_type.charAt(0).toUpperCase() + c.fee_type.slice(1)) }]} /></CardBody></Card>
                )}
            </div>
        </div>
    );
}

function Parties({ parties, canEdit, caseId }: { parties: { id: number; name: string; role_label: string; father_name: string | null; address: string | null; counsel_name: string | null; is_our_side: boolean }[]; canEdit: boolean; caseId: number }) {
    const t = useT();
    if (!parties.length) return <Card><EmptyState icon={<Users className="size-5" />} title={t('No parties recorded')} action={canEdit && <LinkButton href={route('cases.edit', caseId)} variant="secondary">{t('Add parties')}</LinkButton>} /></Card>;
    return (
        <div className="grid gap-4 md:grid-cols-2">
            {[true, false].map((ours) => (
                <Card key={String(ours)}>
                    <CardHeader title={ours ? t('Our side') : t('Opposite side')} />
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {parties.filter((p) => p.is_our_side === ours).map((p) => (
                            <li key={p.id} className="px-5 py-3 text-sm">
                                <p className="font-medium">{p.name} <span className="text-xs font-normal text-navy-500">{p.role_label}</span></p>
                                {p.father_name && <p className="text-xs text-navy-500">{t('s/o, d/o, w/o')} {p.father_name}</p>}
                                {p.counsel_name && <p className="text-xs text-navy-500">{t('Counsel')}: {p.counsel_name}</p>}
                                {p.address && <p className="text-xs text-navy-500">{p.address}</p>}
                            </li>
                        ))}
                    </ul>
                </Card>
            ))}
        </div>
    );
}

function Hearings({ hearings, diary, caseId, can, onOutcome, onReschedule, onCancel, onSchedule }: { hearings: (HearingSummary & Record<string, any>)[]; diary: { id: number; entry_date: string; title: string; notes: string | null; user: string }[]; caseId: number; can: Record<string, boolean>; onOutcome: (h: HearingSummary) => void; onReschedule: (h: HearingSummary) => void; onCancel: (h: HearingSummary) => void; onSchedule: () => void }) {
    const t = useT();
    const { locale } = useLocale();
    const note = useForm({ entry_date: todayIso(), title: '', notes: '', legal_case_id: String(caseId) });

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
                {hearings.length === 0 ? (
                    <Card><EmptyState icon={<CalendarPlus className="size-5" />} title={t('No hearings yet')} action={can.manageHearings && <Button onClick={onSchedule}>{t('Schedule hearing')}</Button>} /></Card>
                ) : (
                    <ol className="relative space-y-4 border-s-2 border-navy-100 ps-5 dark:border-navy-800">
                        {hearings.map((h) => (
                            <li key={h.id} className="relative">
                                <span className={cn('absolute -start-[29px] top-4 size-4 rounded-full border-2 border-white dark:border-navy-950', h.status === 'scheduled' ? 'bg-gold-500' : h.status === 'held' || h.status === 'adjourned' ? 'bg-verdant-600' : 'bg-navy-300')} />
                                <Card className={cn(h.status === 'rescheduled' || h.status === 'cancelled' ? 'opacity-70' : '')}>
                                    <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-3">
                                        <div>
                                            <p className="font-semibold">{formatDate(h.hearing_date, locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{h.hearing_time ? `, ${formatTime(h.hearing_time, locale)}` : ''}</p>
                                            <p className="text-xs text-navy-500">{[h.hearing_type_label, h.purpose, h.court, h.judge].filter(Boolean).join(', ')}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {!h.visible_to_client && <EyeOff className="size-3.5 text-navy-400" aria-label={t('Hidden from client')} />}
                                            <StatusBadge value={h.status} label={h.status_label} />
                                        </div>
                                    </div>
                                    <div className="space-y-2 px-4 py-3 text-sm">
                                        {h.status === 'rescheduled' && <p className="text-xs text-navy-500">{t('Rescheduled')}: {h.reschedule_reason}</p>}
                                        {h.status === 'cancelled' && <p className="text-xs text-navy-500">{t('Cancelled')}: {h.cancellation_reason}</p>}
                                        {h.preparation_notes && h.status === 'scheduled' && <p className="rounded bg-gold-50 px-2 py-1 text-xs text-gold-700 dark:bg-gold-700/20 dark:text-gold-200">{h.preparation_notes}</p>}
                                        {h.has_outcome && (
                                            <dl className="grid gap-2 sm:grid-cols-2">
                                                {h.order_passed && <div className="sm:col-span-2"><dt className="text-xs font-semibold text-navy-500">{t('Order passed')}</dt><dd className="whitespace-pre-line">{h.order_passed}</dd></div>}
                                                {h.adjournment_reason && <div><dt className="text-xs font-semibold text-navy-500">{t('Adjournment reason')}</dt><dd>{h.adjournment_reason}</dd></div>}
                                                {h.lawyer_attendance && <div><dt className="text-xs font-semibold text-navy-500">{t('Appearance')}</dt><dd>{t('Lawyer')}: {h.lawyer_attendance}{h.client_attendance ? `, ${t('Client')}: ${h.client_attendance}` : ''}</dd></div>}
                                                {h.proceedings && <div className="sm:col-span-2"><dt className="text-xs font-semibold text-navy-500">{t('Proceedings')}</dt><dd className="whitespace-pre-line">{h.proceedings}</dd></div>}
                                                {h.arguments && <div className="sm:col-span-2"><dt className="text-xs font-semibold text-navy-500">{t('Arguments')}</dt><dd className="whitespace-pre-line">{h.arguments}</dd></div>}
                                                {h.evidence && <div className="sm:col-span-2"><dt className="text-xs font-semibold text-navy-500">{t('Evidence')}</dt><dd className="whitespace-pre-line">{h.evidence}</dd></div>}
                                                {h.internal_notes && <div className="sm:col-span-2 rounded bg-navy-50 p-2 dark:bg-navy-800"><dt className="flex items-center gap-1 text-xs font-semibold text-navy-500"><Lock className="size-3" />{t('Internal notes')}</dt><dd className="whitespace-pre-line">{h.internal_notes}</dd></div>}
                                                {h.client_note && <div className="sm:col-span-2"><dt className="text-xs font-semibold text-navy-500">{t('Note for the client')}</dt><dd>{h.client_note}</dd></div>}
                                                {h.recorded_by && <p className="text-xs text-navy-400 sm:col-span-2">{t('Recorded by :name', { name: h.recorded_by })}, {formatDateTime(h.outcome_recorded_at, locale)}</p>}
                                            </dl>
                                        )}
                                    </div>
                                    {(h.status === 'scheduled' || (h.has_outcome && can.recordOutcome)) && (
                                        <div className="flex flex-wrap gap-2 border-t border-navy-100 px-4 py-2.5 dark:border-navy-800">
                                            {can.recordOutcome && (h.status === 'scheduled' || h.has_outcome) && <Button size="sm" variant={h.has_outcome ? 'ghost' : 'success'} onClick={() => onOutcome(h)}>{h.has_outcome ? t('Correct record') : t('Record proceedings')}</Button>}
                                            {can.manageHearings && h.status === 'scheduled' && (
                                                <>
                                                    <Button size="sm" variant="secondary" onClick={() => onReschedule(h)}>{t('Reschedule')}</Button>
                                                    <Button size="sm" variant="ghost" onClick={() => onCancel(h)}>{t('Cancel')}</Button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
            <Card>
                <CardHeader title={t('Court diary notes')} />
                <CardBody className="space-y-4">
                    <form onSubmit={(e) => { e.preventDefault(); note.post(route('diary.entries.store'), { preserveScroll: true, onSuccess: () => note.reset('title', 'notes') }); }} className="space-y-2">
                        <Input label={t('Date')} type="date" value={note.data.entry_date} onChange={(e) => note.setData('entry_date', e.target.value)} />
                        <Input label={t('Note')} value={note.data.title} onChange={(e) => note.setData('title', e.target.value)} error={note.errors.title} placeholder={t('e.g. Certified copy applied for')} />
                        <Button type="submit" size="sm" loading={note.processing} disabled={!note.data.title}>{t('Add note')}</Button>
                    </form>
                    <ul className="space-y-3 border-t border-navy-100 pt-3 text-sm dark:border-navy-800">
                        {diary.length === 0 && <li className="text-navy-500">—</li>}
                        {diary.map((d) => (
                            <li key={d.id}><p className="font-medium">{d.title}</p><p className="text-xs text-navy-500">{formatDate(d.entry_date, locale)}, {d.user}</p></li>
                        ))}
                    </ul>
                </CardBody>
            </Card>
        </div>
    );
}

function Documents({ documents, drafts, can, caseId, onUpload }: { documents: any[]; drafts: any[]; can: Record<string, boolean>; caseId: number; onUpload: () => void }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
                <CardHeader title={t('Documents')} actions={can.uploadDocuments && <Button size="sm" icon={<FilePlus2 className="size-4" />} onClick={onUpload}>{t('Upload')}</Button>} />
                {documents.length === 0 ? <EmptyState title={t('No documents yet')} /> : (
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {documents.map((d) => (
                            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                                <Link href={route('documents.show', d.id)} className="min-w-0">
                                    <p className="flex items-center gap-1.5 font-medium hover:underline">{d.is_confidential && <Lock className="size-3.5 text-red-600" />}{d.title}</p>
                                    <p className="text-xs text-navy-500">{d.category_label}, v{d.version}, {d.size ? formatBytes(d.size) : ''}, {formatDate(d.updated_at, locale)}{d.source === 'client' ? `, ${t('From client')}` : ''}</p>
                                </Link>
                                <div className="flex items-center gap-2">
                                    {d.shared_count > 0 && <Badge tone="green">{t('Shared')}</Badge>}
                                    <a href={route('documents.download', d.id)} className="rounded p-1.5 hover:bg-navy-100 dark:hover:bg-navy-800" aria-label={t('Download')}><Download className="size-4" /></a>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
            <Card>
                <CardHeader title={t('Drafts')} actions={can.draft && <LinkButton href={route('drafts.create', { case_id: caseId })} size="sm" variant="secondary" icon={<FileSignature className="size-4" />}>{t('New draft')}</LinkButton>} />
                <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                    {drafts.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">—</li>}
                    {drafts.map((d) => (
                        <li key={d.id} className="px-5 py-3 text-sm">
                            <Link href={route('drafts.edit', d.id)} className="font-medium hover:underline">{d.title}</Link>
                            <p className="flex items-center gap-2 text-xs text-navy-500"><StatusBadge value={d.status} label={d.status_label} /> v{d.version}</p>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    );
}

function Tasks({ tasks, can, onEdit }: { tasks: TaskItem[]; can: Record<string, boolean>; onEdit: (t: TaskItem | null) => void }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <Card>
            <CardHeader title={t('Tasks')} actions={can.manageTasks && <Button size="sm" icon={<Plus className="size-4" />} onClick={() => onEdit(null)}>{t('New task')}</Button>} />
            {tasks.length === 0 ? <EmptyState title={t('No tasks')} /> : (
                <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                    {tasks.map((task) => (
                        <li key={task.id} className="flex items-start gap-3 px-5 py-3">
                            <button type="button" onClick={() => router.post(route('tasks.toggle', task.id), {}, { preserveScroll: true })} aria-label={t('Toggle done')} className="mt-0.5">
                                {task.status === 'done' ? <CheckCircle2 className="size-5 text-verdant-600" /> : <Circle className="size-5 text-navy-300" />}
                            </button>
                            <button type="button" className="min-w-0 flex-1 text-start" onClick={() => onEdit(task)}>
                                <p className={cn('text-sm font-medium', task.status === 'done' && 'text-navy-400 line-through')}>{task.title}</p>
                                <p className={cn('text-xs', task.overdue ? 'font-semibold text-red-600' : 'text-navy-500')}>{task.due_date ? formatDate(task.due_date, locale) : t('No due date')}{task.assignee ? `, ${task.assignee}` : ''}</p>
                            </button>
                            <StatusBadge value={task.priority} label={task.priority_label} />
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

function Finance({ data, c, can }: { data: Record<string, any>; c: CaseData; can: Record<string, boolean> }) {
    const t = useT();
    const { locale } = useLocale();
    const form = useForm({ category: 'court_fee', description: '', amount: '', incurred_on: todayIso(), is_billable: true });
    const expenses: any[] = data.expenses ?? [];
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const categories = ['court_fee', 'stamp_paper', 'filing', 'travel', 'photocopy', 'expert', 'other'].map((v) => ({ value: v, label: t(`expense.${v}`) }));

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
                <Card>
                    <CardHeader title={t('Expenses')} description={t('Total: :amount', { amount: formatMoney(total, locale) })} />
                    {expenses.length === 0 ? <p className="px-5 py-6 text-sm text-navy-500">{t('No expenses recorded.')}</p> : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                                    {expenses.map((e) => (
                                        <tr key={e.id}>
                                            <td className="px-5 py-2.5">{formatDate(e.incurred_on, locale)}</td>
                                            <td className="px-2 py-2.5"><p>{e.description}</p><p className="text-xs text-navy-500">{t(`expense.${e.category}`)}{e.is_billable ? '' : `, ${t('Non-billable')}`}</p></td>
                                            <td className="px-2 py-2.5 text-end tabular-nums">{formatMoney(e.amount, locale)}</td>
                                            <td className="px-5 py-2.5 text-end">
                                                {e.invoice_item_id ? <Badge tone="green">{t('Invoiced')}</Badge> : can.manageExpenses && (
                                                    <ConfirmAction href={route('expenses.destroy', e.id)} method="delete" title={t('Remove expense?')} trigger={(open) => <button type="button" onClick={open} aria-label={t('Remove')} className="text-navy-400 hover:text-red-600"><Trash2 className="size-4" /></button>} />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
                {data.invoices && (
                    <Card>
                        <CardHeader title={t('Invoices')} actions={can.invoice && <LinkButton href={route('invoices.create', { case_id: c.id, client_id: c.clients[0]?.id })} size="sm" icon={<Receipt className="size-4" />}>{t('New invoice')}</LinkButton>} />
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {data.invoices.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">—</li>}
                            {data.invoices.map((i: any) => (
                                <li key={i.id}>
                                    <Link href={route('invoices.show', i.id)} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-navy-50/60 dark:hover:bg-navy-800/40">
                                        <span className="ltr-nums font-medium">{i.number}</span><span>{i.client}</span>
                                        <span className="tabular-nums">{formatMoney(i.amount_paid, locale)} / {formatMoney(i.total, locale)}</span>
                                        <StatusBadge value={i.status} label={i.status_label} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </div>
            {can.manageExpenses && (
                <Card>
                    <CardHeader title={t('Record expense')} />
                    <CardBody>
                        <form onSubmit={(e) => { e.preventDefault(); form.post(route('cases.expenses.store', c.id), { preserveScroll: true, onSuccess: () => form.reset('description', 'amount') }); }} className="space-y-3">
                            <Select label={t('Category')} value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} options={categories} />
                            <Input label={t('Description')} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} error={form.errors.description} required />
                            <div className="grid grid-cols-2 gap-3">
                                <Input label={t('Amount (PKR)')} type="number" min={1} value={form.data.amount} onChange={(e) => form.setData('amount', e.target.value)} error={form.errors.amount} required />
                                <Input label={t('Date')} type="date" max={todayIso()} value={form.data.incurred_on} onChange={(e) => form.setData('incurred_on', e.target.value)} error={form.errors.incurred_on} />
                            </div>
                            <Checkbox label={t('Bill to client')} checked={form.data.is_billable} onChange={(e) => form.setData('is_billable', e.target.checked)} />
                            <Button type="submit" className="w-full" loading={form.processing}>{t('Save expense')}</Button>
                        </form>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}

function Communications({ data, c, can }: { data: Record<string, any>; c: CaseData; can: Record<string, boolean> }) {
    const t = useT();
    const { locale } = useLocale();
    const portalClients = c.clients.filter((cl) => cl.has_portal);
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader title={t('Messages')} />
                <CardBody className="space-y-3">
                    {(data.conversations ?? []).map((conv: any) => (
                        <Link key={conv.id} href={route('messages.show', conv.id)} className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm hover:bg-navy-50 dark:border-navy-800 dark:hover:bg-navy-800">
                            <span><span className="font-medium">{conv.client}</span>, {conv.subject}</span><span className="text-xs text-navy-500">{conv.last_message_at && formatDateTime(conv.last_message_at, locale)}</span>
                        </Link>
                    ))}
                    {can.message && portalClients.map((cl) => (
                        <Link key={cl.id} href={route('messages.store')} method="post" as="button" data={{ client_id: cl.id, legal_case_id: c.id }} className="inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:underline dark:text-gold-300">
                            <MessageSquare className="size-4" />{t('Message :name about this case', { name: cl.name })}
                        </Link>
                    ))}
                    {portalClients.length === 0 && <Alert tone="info">{t('None of this case’s clients has a portal account, so secure messaging is not available yet.')}</Alert>}
                </CardBody>
            </Card>
            <Card>
                <CardHeader title={t('Appointments')} />
                <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                    {(data.appointments ?? []).length === 0 && <li className="px-5 py-4 text-sm text-navy-500">—</li>}
                    {(data.appointments ?? []).map((a: any) => (
                        <li key={a.id} className="flex items-center justify-between px-5 py-3 text-sm"><span>{formatDateTime(a.starts_at, locale)}, {a.contact_name}</span><StatusBadge value={a.status} label={a.status_label} /></li>
                    ))}
                </ul>
            </Card>
        </div>
    );
}

function Timeline({ events }: { events: { id: number; title: string; description: string | null; occurred_at: string; actor: string | null; visible_to_client: boolean }[] }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <Card>
            <CardBody>
                {events.length === 0 ? <p className="text-sm text-navy-500">—</p> : (
                    <ol className="relative space-y-5 border-s border-navy-200 ps-5 dark:border-navy-700">
                        {events.map((e) => (
                            <li key={e.id} className="relative">
                                <span className="absolute -start-[25px] top-1.5 size-2.5 rounded-full bg-navy-700 dark:bg-gold-500" />
                                <p className="text-sm font-medium">{e.title}</p>
                                {e.description && <p className="text-sm text-navy-600 dark:text-navy-300">{e.description}</p>}
                                <p className="text-xs text-navy-500">{formatDateTime(e.occurred_at, locale)}{e.actor ? `, ${e.actor}` : ''}{e.visible_to_client ? `, ${t('Visible to client')}` : ''}</p>
                            </li>
                        ))}
                    </ol>
                )}
            </CardBody>
        </Card>
    );
}

function Audit({ activities }: { activities: { id: number; event: string; subject: string; changes: any; causer: string | null; created_at: string }[] }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <Card>
            <CardHeader title={t('Audit history')} description={t('Every change to this case and its hearings.')} />
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-navy-50/60 text-[13px] text-navy-600 dark:bg-navy-950/40"><tr><th className="px-4 py-2 text-start">{t('When')}</th><th className="px-4 py-2 text-start">{t('Who')}</th><th className="px-4 py-2 text-start">{t('What')}</th><th className="px-4 py-2 text-start">{t('Changes')}</th></tr></thead>
                    <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                        {activities.map((a) => (
                            <tr key={a.id} className="align-top">
                                <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(a.created_at, locale)}</td>
                                <td className="px-4 py-2">{a.causer ?? t('System')}</td>
                                <td className="px-4 py-2">{t(a.event)}, {a.subject}</td>
                                <td className="px-4 py-2 text-xs"><code className="break-all">{Object.keys(a.changes?.attributes ?? {}).map((k) => `${k}: ${String(a.changes?.old?.[k] ?? '—')} → ${String(a.changes.attributes[k] ?? '—')}`).join('; ')}</code></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function TeamDialog({ open, onClose, c, lawyers }: { open: boolean; onClose: () => void; c: CaseData; lawyers: SelectOption[] }) {
    const t = useT();
    const form = useForm({ lawyer_ids: c.lawyers.map((l) => String(l.id)), lead_lawyer_id: String(c.lawyers.find((l) => l.role === 'lead')?.id ?? c.lawyers[0]?.id ?? '') });
    return (
        <Modal open={open} onClose={onClose} title={t('Case team')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={() => { form.transform((d) => ({ lawyer_ids: d.lawyer_ids.map(Number), lead_lawyer_id: Number(d.lead_lawyer_id) })); form.put(route('cases.lawyers.update', c.id), { preserveScroll: true, onSuccess: onClose }); }}>{t('Save')}</Button></>}>
            <div className="space-y-3">
                {lawyers.map((l) => {
                    const selected = form.data.lawyer_ids.includes(String(l.value));
                    return <Checkbox key={l.value} label={l.label} checked={selected} onChange={() => form.setData('lawyer_ids', selected ? form.data.lawyer_ids.filter((x) => x !== String(l.value)) : [...form.data.lawyer_ids, String(l.value)])} />;
                })}
                <Select label={t('Lead lawyer')} value={form.data.lead_lawyer_id} onChange={(e) => form.setData('lead_lawyer_id', e.target.value)} options={lawyers.filter((l) => form.data.lawyer_ids.includes(String(l.value)))} error={form.errors.lead_lawyer_id} />
                {form.errors.lawyer_ids && <p className="text-xs text-red-600">{form.errors.lawyer_ids}</p>}
            </div>
        </Modal>
    );
}
