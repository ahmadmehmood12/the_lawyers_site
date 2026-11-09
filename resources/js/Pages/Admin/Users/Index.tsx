import { router, useForm } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Checkbox, ConfirmAction, DataTable, Input, Modal, PageHeader, Select, StatusBadge, UserCell } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option, Paginated } from '@/types';

type Row = { id: number; name: string; avatar_url: string | null; email: string; phone: string | null; account_type: string; account_type_label: string; status: string; status_label: string; roles: string[]; created_at: string; last_login_at: string | null; deletion_requested: boolean };

export default function UsersIndex({ users, filters, options, can }: { users: Paginated<Row>; filters: Record<string, string>; options: { types: Option[]; statuses: Option[]; roles: Option[] }; can: { manage: boolean; suspend: boolean; roles: boolean } }) {
    const t = useT();
    const { locale } = useLocale();
    const [roles, setRoles] = useState<Row | null>(null);
    const [staff, setStaff] = useState(false);
    const visit = (p: Record<string, string | undefined>) => router.get(route('admin.users.index'), { ...filters, ...p }, { preserveState: true, replace: true });
    return (
        <AppLayout title={t('Users')} area="admin" wide>
            <PageHeader title={t('Users')} actions={can.roles && <Button icon={<UserPlus className="size-4" />} onClick={() => setStaff(true)}>{t('Add staff')}</Button>} />
            <Card>
                <DataTable rows={users} filters={filters}
                    toolbar={<><Select aria-label={t('Type')} wrapperClassName="w-36" value={filters.type ?? ''} onChange={(e) => visit({ type: e.target.value || undefined })} options={options.types} placeholder={t('All types')} /><Select aria-label={t('Status')} wrapperClassName="w-36" value={filters.status ?? ''} onChange={(e) => visit({ status: e.target.value || undefined })} options={options.statuses} placeholder={t('All statuses')} /></>}
                    columns={[
                        { key: 'name', label: t('User'), sortable: true, render: (r) => <UserCell name={r.name} avatar={r.avatar_url} subtitle={r.email} extra={r.deletion_requested && <Badge tone="red">{t('Deletion requested')}</Badge>} /> },
                        { key: 'type', label: t('Type'), render: (r) => (<div className="flex flex-wrap gap-1"><Badge>{r.account_type_label}</Badge>{r.roles.map((x) => <Badge key={x} tone="navy">{x}</Badge>)}</div>) },
                        { key: 'created_at', label: t('Joined'), sortable: true, hideOnMobile: true, render: (r) => formatDate(r.created_at, locale) },
                        { key: 'last_login_at', label: t('Last sign-in'), sortable: true, hideOnMobile: true, render: (r) => (r.last_login_at ? formatDate(r.last_login_at, locale) : '—') },
                        { key: 'status', label: t('Status'), render: (r) => <StatusBadge value={r.status} label={r.status_label} /> },
                        { key: 'actions', label: '', render: (r) => (
                            <div className="flex justify-end gap-1">
                                {can.roles && r.account_type === 'platform' && <Button size="sm" variant="ghost" onClick={() => setRoles(r)}>{t('Roles')}</Button>}
                                {can.suspend && (r.status === 'active'
                                    ? <ConfirmAction href={route('admin.users.status', r.id)} method="put" data={{ status: 'suspended' }} reasonField="reason" title={t('Suspend :name?', { name: r.name })} confirmLabel={t('Suspend')} trigger={(open) => <Button size="sm" variant="ghost" onClick={open}>{t('Suspend')}</Button>} />
                                    : <Button size="sm" variant="ghost" onClick={() => router.put(route('admin.users.status', r.id), { status: 'active' }, { preserveScroll: true })}>{t('Reactivate')}</Button>)}
                            </div>
                        ) },
                    ]} />
            </Card>
            <RolesDialog user={roles} onClose={() => setRoles(null)} options={options.roles} />
            <StaffDialog open={staff} onClose={() => setStaff(false)} roles={options.roles} />
        </AppLayout>
    );
}

function RolesDialog({ user, onClose, options }: { user: Row | null; onClose: () => void; options: Option[] }) {
    const t = useT();
    const form = useForm({ roles: user?.roles ?? [] });
    return (
        <Modal key={user?.id} open={!!user} onClose={onClose} title={t('Platform roles')} description={user?.name} size="sm" footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={() => user && form.put(route('admin.users.roles', user.id), { preserveScroll: true, onSuccess: onClose })}>{t('Save')}</Button></>}>
            <div className="space-y-2">{options.map((o) => <Checkbox key={o.value} label={o.label} checked={form.data.roles.includes(o.value)} onChange={() => form.setData('roles', form.data.roles.includes(o.value) ? form.data.roles.filter((r) => r !== o.value) : [...form.data.roles, o.value])} />)}</div>
        </Modal>
    );
}

function StaffDialog({ open, onClose, roles }: { open: boolean; onClose: () => void; roles: Option[] }) {
    const t = useT();
    const form = useForm({ name: '', email: '', role: 'support' });
    return (
        <Modal open={open} onClose={onClose} title={t('Add platform staff')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button loading={form.processing} onClick={() => form.post(route('admin.users.staff.store'), { onSuccess: () => { form.reset(); onClose(); } })}>{t('Create')}</Button></>}>
            <div className="space-y-4">
                <Input label={t('Name')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                <Input label={t('Email')} type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} />
                <Select label={t('Role')} value={form.data.role} onChange={(e) => form.setData('role', e.target.value)} options={roles} />
            </div>
        </Modal>
    );
}
