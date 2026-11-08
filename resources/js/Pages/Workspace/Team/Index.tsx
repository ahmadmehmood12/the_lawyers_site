import { router, useForm } from '@inertiajs/react';
import { Mail, UserPlus } from 'lucide-react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, StatusBadge } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { Option } from '@/types';

type Member = { id: number; user_id: number; name: string; email: string; phone: string | null; role: string; role_label: string; status: string; status_label: string; is_owner: boolean; joined_at: string | null };

export default function TeamIndex({ members, invitations, roles, permissions, isFirm }: { members: Member[]; invitations: { id: number; email: string; role_label: string; expires_at: string }[]; roles: Option[]; permissions: Record<string, string[]>; isFirm: boolean }) {
    const t = useT();
    const { locale } = useLocale();
    const invite = useForm({ email: '', role: 'associate_advocate' });

    return (
        <AppLayout title={t('Team')}>
            <PageHeader title={t('Team')} description={t('Members, roles and invitations. Each role grants a fixed set of permissions.')} />
            {!isFirm && <Alert tone="info" className="mb-5">{t('You can add a clerk, assistant or associate to your individual practice.')}</Alert>}
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title={t('Members')} />
                    <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                        {members.map((m) => (
                            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                                <div className="min-w-0">
                                    <p className="font-medium">{m.name} {m.is_owner && <Badge tone="gold">{t('Owner')}</Badge>}</p>
                                    <p className="text-xs text-navy-500">{m.email}{m.joined_at ? `, ${t('Joined :date', { date: formatDate(m.joined_at, locale) })}` : ''}</p>
                                </div>
                                {m.is_owner ? <Badge tone="navy">{m.role_label}</Badge> : (
                                    <div className="flex items-center gap-2">
                                        <Select aria-label={t('Role')} value={m.role} onChange={(e) => router.put(route('team.members.update', m.id), { role: e.target.value, status: m.status }, { preserveScroll: true })} options={roles} wrapperClassName="w-44" />
                                        <Select aria-label={t('Status')} value={m.status} onChange={(e) => router.put(route('team.members.update', m.id), { role: m.role, status: e.target.value }, { preserveScroll: true })} options={[{ value: 'active', label: t('Active') }, { value: 'suspended', label: t('Suspended') }, { value: 'removed', label: t('Remove') }]} wrapperClassName="w-32" />
                                        {m.status !== 'active' && <StatusBadge value={m.status} label={m.status_label} />}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </Card>
                <div className="space-y-6">
                    <Card>
                        <CardHeader title={t('Invite a member')} />
                        <CardBody>
                            <form onSubmit={(e) => { e.preventDefault(); invite.post(route('team.invite'), { preserveScroll: true, onSuccess: () => invite.reset('email') }); }} className="space-y-3">
                                <Input label={t('Email')} type="email" value={invite.data.email} onChange={(e) => invite.setData('email', e.target.value)} error={invite.errors.email} required />
                                <Select label={t('Role')} value={invite.data.role} onChange={(e) => invite.setData('role', e.target.value)} options={roles} error={invite.errors.role} />
                                <p className="text-xs text-navy-500">{t('Permissions')}: {(permissions[invite.data.role] ?? []).length}</p>
                                <Button type="submit" className="w-full" icon={<UserPlus className="size-4" />} loading={invite.processing}>{t('Send invitation')}</Button>
                            </form>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader title={t('Pending invitations')} />
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {invitations.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">—</li>}
                            {invitations.map((i) => (
                                <li key={i.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                                    <div><p className="flex items-center gap-1.5"><Mail className="size-3.5" />{i.email}</p><p className="text-xs text-navy-500">{i.role_label}, {t('Expires :date', { date: formatDate(i.expires_at, locale) })}</p></div>
                                    <Button size="sm" variant="ghost" onClick={() => router.delete(route('team.invitations.destroy', i.id), { preserveScroll: true })}>{t('Revoke')}</Button>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
