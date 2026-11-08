import { router, useForm } from '@inertiajs/react';
import { Lock, Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, ConfirmAction, Input, Modal, PageHeader } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';

type Role = { id: number; name: string; label: string; built_in: boolean; locked: boolean; permissions: string[]; users_count: number };
type Permission = { value: string; label: string; group: string };

export default function Roles({ roles, permissions }: { roles: Role[]; permissions: Permission[] }) {
    const t = useT();
    const [editing, setEditing] = useState<Role | 'new' | null>(null);
    const labelFor = (name: string) => permissions.find((p) => p.value === name)?.label ?? name;

    return (
        <AppLayout title={t('Roles & Permissions')} area="admin">
            <PageHeader
                title={t('Roles and permissions')}
                description={t('Roles for the platform team. Firm roles (senior advocate, clerk and so on) are set per firm.')}
                actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>{t('New role')}</Button>}
            />
            <div className="grid gap-4 lg:grid-cols-2">
                {roles.map((role) => (
                    <Card key={role.id}>
                        <CardHeader
                            title={<span className="inline-flex items-center gap-2">{role.label}{role.locked && <Lock className="size-4 text-navy-400" aria-label={t('Locked')} />}</span>}
                            description={t(':count staff members', { count: role.users_count })}
                            actions={
                                <div className="flex gap-1">
                                    {role.built_in ? <Badge>{t('Built-in')}</Badge> : <Badge tone="navy">{t('Custom')}</Badge>}
                                </div>
                            }
                        />
                        <CardBody className="space-y-4">
                            {role.locked ? (
                                <p className="text-sm text-navy-600 dark:text-navy-300">{t('Has every permission, including managing roles. It cannot be edited.')}</p>
                            ) : role.permissions.length === 0 ? (
                                <p className="text-sm text-navy-500">{t('No permissions yet.')}</p>
                            ) : (
                                <ul className="flex flex-wrap gap-1.5">
                                    {role.permissions.map((p) => <li key={p}><Badge>{labelFor(p)}</Badge></li>)}
                                </ul>
                            )}
                            {!role.locked && (
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => setEditing(role)}>{t('Edit permissions')}</Button>
                                    {!role.built_in && (
                                        <ConfirmAction
                                            href={route('admin.roles.destroy', role.id)}
                                            method="delete"
                                            title={t('Delete the role :name?', { name: role.label })}
                                            description={role.users_count > 0 ? t('Remove this role from its users before deleting it.') : undefined}
                                            confirmLabel={t('Delete')}
                                            trigger={(open) => <Button size="sm" variant="ghost" onClick={open} disabled={role.users_count > 0}>{t('Delete')}</Button>}
                                        />
                                    )}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                ))}
            </div>
            {editing && <RoleDialog role={editing === 'new' ? null : editing} permissions={permissions} onClose={() => setEditing(null)} />}
        </AppLayout>
    );
}

function RoleDialog({ role, permissions, onClose }: { role: Role | null; permissions: Permission[]; onClose: () => void }) {
    const t = useT();
    const form = useForm({ name: role?.name ?? '', permissions: role?.permissions ?? [] });
    const groups = Array.from(new Set(permissions.map((p) => p.group)));
    const toggle = (name: string, on: boolean) => form.setData('permissions', on ? [...form.data.permissions, name] : form.data.permissions.filter((p) => p !== name));
    const submit = () => (role ? form.put(route('admin.roles.update', role.id), { preserveScroll: true, onSuccess: onClose }) : form.post(route('admin.roles.store'), { preserveScroll: true, onSuccess: onClose }));

    return (
        <Modal open onClose={onClose} title={role ? t('Edit :name', { name: role.label }) : t('New role')} size="lg">
            <div className="space-y-5">
                {(!role || !role.built_in) && (
                    <Input label={t('Role name')} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} hint={t('Lowercase letters and dashes, for example content-editor.')} required />
                )}
                {form.data.permissions.includes('roles.manage') && <Alert tone="warning">{t('Anyone with this role can change every role, including their own.')}</Alert>}
                <div className="grid gap-4 sm:grid-cols-2">
                    {groups.map((group) => (
                        <fieldset key={group} className="space-y-2">
                            <legend className="text-sm font-semibold capitalize">{group}</legend>
                            {permissions.filter((p) => p.group === group).map((p) => (
                                <Checkbox key={p.value} label={p.label} checked={form.data.permissions.includes(p.value)} onChange={(e) => toggle(p.value, e.target.checked)} />
                            ))}
                        </fieldset>
                    ))}
                </div>
                {form.errors.permissions && <p className="text-xs text-red-600">{form.errors.permissions}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button>
                    <Button loading={form.processing} onClick={submit}>{t('Save role')}</Button>
                </div>
            </div>
        </Modal>
    );
}
