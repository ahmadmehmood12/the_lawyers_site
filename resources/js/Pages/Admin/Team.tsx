import { router, useForm } from '@inertiajs/react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, ConfirmAction, Input, Modal, PageHeader, Select, Textarea, UserCell } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';

type Member = { id: number; team_designation_id: number | null; designation: string | null; name: string; bio: string | null; qualifications: string | null; experience: string | null; linkedin_url: string | null; profile_url: string | null; is_active: boolean; sort_order: number; photo_url: string | null };
type Designation = { id: number; name: string; name_ur: string | null; sort_order: number; members_count: number };

const fileClasses = 'block w-full text-sm text-navy-700 file:me-3 file:rounded-md file:border-0 file:bg-navy-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-navy-800 hover:file:bg-navy-200 dark:text-navy-200 dark:file:bg-navy-800 dark:file:text-navy-100';

/** Admin, Team: founders, patrons, advisers and team shown on the homepage, grouped by designation. */
export default function Team({ members, designations }: { members: Member[]; designations: Designation[] }) {
    const t = useT();
    const [editing, setEditing] = useState<Member | null | undefined>(undefined);

    return (
        <AppLayout title={t('Team & Founders')} area="admin" wide>
            <PageHeader title={t('Team & Founders')} description={t('People shown in the homepage team section, grouped and ordered by designation.')} actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)} disabled={designations.length === 0}>{t('Add team member')}</Button>} />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <Card>
                    {members.length === 0 ? <p className="p-8 text-center text-sm text-navy-500">{t('No team members yet.')}</p> : (
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {members.map((m) => (
                                <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                                    <UserCell className="min-w-0 flex-1" name={m.name} avatar={m.photo_url} subtitle={[m.designation, m.qualifications].filter(Boolean).join(', ')} extra={!m.is_active && <Badge>{t('Hidden')}</Badge>} />
                                    {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="text-navy-400 hover:text-navy-700"><ExternalLink className="size-4" /></a>}
                                    <span className="text-xs text-navy-500 tabular-nums">#{m.sort_order}</span>
                                    <Button size="sm" variant="ghost" aria-label={t('Edit')} onClick={() => setEditing(m)}><Pencil className="size-4" /></Button>
                                    <ConfirmAction href={route('admin.team.destroy', m.id)} method="delete" title={t('Remove :name?', { name: m.name })} confirmLabel={t('Remove')} trigger={(open) => <Button size="sm" variant="ghost" aria-label={t('Remove')} onClick={open}><Trash2 className="size-4" /></Button>} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <DesignationsCard designations={designations} />
            </div>
            {editing !== undefined && <MemberDialog key={editing?.id ?? 'new'} member={editing} designations={designations} onClose={() => setEditing(undefined)} />}
        </AppLayout>
    );
}

function DesignationsCard({ designations }: { designations: Designation[] }) {
    const t = useT();
    const form = useForm({ name: '', name_ur: '', sort_order: '' });
    return (
        <Card className="h-fit">
            <CardHeader title={t('Designations')} description={t('Founder, Patron, Legal Advisor, or your own titles. The order here sets the section order.')} />
            <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                {designations.map((d) => <DesignationRow key={d.id} designation={d} />)}
            </ul>
            <CardBody className="space-y-2 border-t border-navy-100 dark:border-navy-800">
                <Input label={t('New designation')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                <div className="grid grid-cols-2 gap-2">
                    <Input label={t('In Urdu')} dir="rtl" value={form.data.name_ur} onChange={(e) => form.setData('name_ur', e.target.value)} />
                    <Input label={t('Order')} type="number" min={0} value={form.data.sort_order} onChange={(e) => form.setData('sort_order', e.target.value)} />
                </div>
                <Button size="sm" loading={form.processing} disabled={!form.data.name} onClick={() => form.post(route('admin.team-designations.store'), { preserveScroll: true, onSuccess: () => form.reset() })}>{t('Add designation')}</Button>
            </CardBody>
        </Card>
    );
}

function DesignationRow({ designation: d }: { designation: Designation }) {
    const t = useT();
    const [editing, setEditing] = useState(false);
    const form = useForm({ name: d.name, name_ur: d.name_ur ?? '', sort_order: String(d.sort_order) });
    return (
        <li className="px-5 py-2.5 text-sm">
            {editing ? (
                <div className="space-y-2">
                    <Input aria-label={t('Name')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                    <div className="grid grid-cols-2 gap-2">
                        <Input aria-label={t('In Urdu')} dir="rtl" value={form.data.name_ur} onChange={(e) => form.setData('name_ur', e.target.value)} />
                        <Input aria-label={t('Order')} type="number" value={form.data.sort_order} onChange={(e) => form.setData('sort_order', e.target.value)} />
                    </div>
                    <div className="flex gap-2"><Button size="sm" loading={form.processing} onClick={() => form.put(route('admin.team-designations.update', d.id), { preserveScroll: true, onSuccess: () => setEditing(false) })}>{t('Save')}</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t('Cancel')}</Button></div>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <span className="flex-1"><span className="font-medium">{d.name}</span> <span className="text-xs text-navy-500">({t(':count people', { count: d.members_count })})</span></span>
                    <button type="button" className="text-navy-400 hover:text-navy-700" aria-label={t('Edit')} onClick={() => setEditing(true)}><Pencil className="size-3.5" /></button>
                    {d.members_count === 0 && <button type="button" className="text-navy-400 hover:text-red-600" aria-label={t('Delete')} onClick={() => router.delete(route('admin.team-designations.destroy', d.id), { preserveScroll: true })}><Trash2 className="size-3.5" /></button>}
                </div>
            )}
        </li>
    );
}

function MemberDialog({ member, designations, onClose }: { member: Member | null; designations: Designation[]; onClose: () => void }) {
    const t = useT();
    const form = useForm<{ name: string; team_designation_id: string; bio: string; qualifications: string; experience: string; linkedin_url: string; profile_url: string; is_active: boolean; sort_order: string; photo: File | null }>({
        name: member?.name ?? '', team_designation_id: member?.team_designation_id ? String(member.team_designation_id) : String(designations[0]?.id ?? ''),
        bio: member?.bio ?? '', qualifications: member?.qualifications ?? '', experience: member?.experience ?? '', linkedin_url: member?.linkedin_url ?? '', profile_url: member?.profile_url ?? '',
        is_active: member?.is_active ?? true, sort_order: String(member?.sort_order ?? 0), photo: null,
    });
    function submit() {
        form.transform((d) => ({ ...d, team_designation_id: d.team_designation_id || null, linkedin_url: d.linkedin_url || null, profile_url: d.profile_url || null }));
        const options = { forceFormData: true, preserveScroll: true, onSuccess: onClose };
        if (member) form.post(route('admin.team.update', member.id), options);
        else form.post(route('admin.team.store'), options);
    }
    return (
        <Modal open onClose={onClose} title={member ? t('Edit team member') : t('Add team member')} size="lg" footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={submit}>{t('Save')}</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('Name')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
                <Select label={t('Designation')} value={form.data.team_designation_id} onChange={(e) => form.setData('team_designation_id', e.target.value)} options={designations.map((d) => ({ value: String(d.id), label: d.name }))} error={form.errors.team_designation_id} />
                <Input label={t('Qualifications')} placeholder={t('e.g. LL.M. (London), Advocate Supreme Court')} value={form.data.qualifications} onChange={(e) => form.setData('qualifications', e.target.value)} error={form.errors.qualifications} />
                <Input label={t('Experience')} placeholder={t('e.g. 25 years in constitutional litigation')} value={form.data.experience} onChange={(e) => form.setData('experience', e.target.value)} error={form.errors.experience} />
                <Textarea wrapperClassName="sm:col-span-2" label={t('Biography')} rows={4} value={form.data.bio} onChange={(e) => form.setData('bio', e.target.value)} error={form.errors.bio} />
                <Input label="LinkedIn" type="url" value={form.data.linkedin_url} onChange={(e) => form.setData('linkedin_url', e.target.value)} error={form.errors.linkedin_url} />
                <Input label={t('Profile link')} type="url" value={form.data.profile_url} onChange={(e) => form.setData('profile_url', e.target.value)} error={form.errors.profile_url} />
                <div className="space-y-1.5">
                    <p className="text-sm font-medium">{t('Photo')}</p>
                    {member?.photo_url && <img src={member.photo_url} alt="" className="size-16 rounded-lg object-cover" />}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className={fileClasses} onChange={(e) => form.setData('photo', e.target.files?.[0] ?? null)} aria-label={t('Photo')} />
                    <p className="text-xs text-navy-500">{t('Portrait, at least 300 × 300 pixels.')}</p>
                    {form.errors.photo && <p className="text-xs text-red-600">{form.errors.photo}</p>}
                </div>
                <div className="space-y-3">
                    <Input label={t('Display order')} type="number" min={0} value={form.data.sort_order} onChange={(e) => form.setData('sort_order', e.target.value)} />
                    <Checkbox label={t('Active (shown on the homepage)')} checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
                </div>
            </div>
        </Modal>
    );
}
