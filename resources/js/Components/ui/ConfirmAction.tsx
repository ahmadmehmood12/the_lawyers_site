import { router } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { Button } from './Button';
import { Textarea } from './Field';
import { Modal } from './Modal';

type Props = {
    trigger: (open: () => void) => ReactNode;
    title: ReactNode;
    description?: ReactNode;
    href: string;
    method?: 'post' | 'put' | 'patch' | 'delete';
    confirmLabel?: string;
    tone?: 'danger' | 'primary';
    /** When set, the user must supply a reason which is sent as this field. */
    reasonField?: string;
    data?: Record<string, string | number | boolean>;
};

/** Confirmation dialog for destructive or irreversible actions (with optional reason). */
export function ConfirmAction({ trigger, title, description, href, method = 'post', confirmLabel, tone = 'danger', reasonField, data = {} }: Props) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string>();

    function submit() {
        setProcessing(true);
        router.visit(href, {
            method,
            data: reasonField ? { ...data, [reasonField]: reason } : data,
            preserveScroll: true,
            onSuccess: () => setOpen(false),
            onError: (errors) => setError(Object.values(errors)[0]),
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <>
            {trigger(() => setOpen(true))}
            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={title}
                description={description}
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button variant={tone} loading={processing} onClick={submit} disabled={!!reasonField && reason.trim().length < 3}>
                            {confirmLabel ?? t('Confirm')}
                        </Button>
                    </>
                }
            >
                {reasonField ? <Textarea label={t('Reason')} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} error={error} required /> : error && <p className="text-sm text-red-600">{error}</p>}
            </Modal>
        </>
    );
}
