import { Link, router, usePage } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { Alert, Button, LinkButton } from '@/Components/ui';
import AuthLayout from '@/Layouts/AuthLayout';
import { useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';

type Props = { token: string; invitation: { organization: string; inviter: string; role: string; email: string }; emailMatches: boolean };

export default function Invitation({ token, invitation, emailMatches }: Props) {
    const t = useT();
    const { auth } = usePage<SharedProps>().props;

    return (
        <AuthLayout title={t('You are invited')}>
            <div className="flex flex-col items-center text-center">
                <div className="mb-3 rounded-full bg-navy-50 p-3 dark:bg-navy-800"><Building2 className="size-6 text-navy-700 dark:text-gold-300" /></div>
                <p className="text-lg font-semibold">{invitation.organization}</p>
                <p className="mt-1 text-sm text-navy-600 dark:text-navy-300">{t(':inviter invited :email to join as :role.', { inviter: invitation.inviter, email: invitation.email, role: invitation.role })}</p>
            </div>
            <div className="mt-6 space-y-3">
                {!auth.user ? (
                    <>
                        <LinkButton href={route('login')} className="w-full">{t('Sign in to accept')}</LinkButton>
                        <LinkButton href={route('register', { type: 'client' })} variant="secondary" className="w-full">{t('Create an account with :email', { email: invitation.email })}</LinkButton>
                    </>
                ) : emailMatches ? (
                    <Button className="w-full" onClick={() => router.post(route('invitations.accept', token))}>{t('Accept invitation')}</Button>
                ) : (
                    <Alert tone="warning">{t('You are signed in as :email. Sign in with the invited email to accept.', { email: auth.user.email })} <Link href={route('logout')} method="post" as="button" className="font-semibold underline">{t('Sign out')}</Link></Alert>
                )}
            </div>
        </AuthLayout>
    );
}
