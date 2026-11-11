import { Crown, Sparkles } from 'lucide-react';
import { openUpgrade, type UpgradeOffer } from '@/Components/domain/UpgradeModal';
import { useState } from 'react';
import { Alert, Button, Card, CardBody, PageHeader, Select } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';
import { AiPanel } from '../Drafts/Editor';

export default function AiIndex({ available, planAllows, upgrade, usage, features, cases }: { available: boolean; planAllows: boolean; upgrade: UpgradeOffer | null; usage: { used: number; limit: number | null }; features: string[]; cases: SelectOption[] }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [caseId, setCaseId] = useState('');
    return (
        <AppLayout title={t('AI Assistant')}>
            <PageHeader title={t('AI Assistant')} description={t('Drafting help, summaries, chronologies and translation. Always unverified until you review it.')} />
            <div className="max-w-3xl space-y-4">
                {!available && <Alert tone="info" title={t('Not configured yet')}>{t('The platform administrator has not connected an AI provider. This feature is unavailable until then.')}</Alert>}
                {available && !planAllows && <Alert tone="warning" action={upgrade && <Button size="sm" icon={<Crown className="size-4" />} onClick={() => openUpgrade(upgrade)}>{t('Upgrade')}</Button>}>{t('AI assistance is not included in your current plan.')}</Alert>}
                <Alert tone="warning" title={t('Professional responsibility')}>{t('AI can be wrong and may invent references. It never searches court databases. Verify every statute, citation and fact against official sources before relying on it.')}</Alert>
                <Card>
                    <CardBody className="space-y-4">
                        <p className="text-sm text-navy-600 dark:text-navy-300">{t('Used this month: :used of :limit', { used: usage.used, limit: usage.limit ?? t('unlimited') })}</p>
                        <div className="grid gap-2 sm:grid-cols-2">{features.map((f) => <p key={f} className="rounded-lg bg-navy-50 px-3 py-2 text-sm dark:bg-navy-800">{t(`ai.${f}`)}</p>)}</div>
                        <Select label={t('Case context (names are masked)')} value={caseId} onChange={(e) => setCaseId(e.target.value)} options={cases} placeholder={t('None')} />
                        <Button icon={<Sparkles className="size-4" />} disabled={!available} onClick={() => (planAllows || !upgrade ? setOpen(true) : openUpgrade(upgrade))}>{t('Open assistant')}</Button>
                    </CardBody>
                </Card>
            </div>
            <AiPanel open={open} onClose={() => setOpen(false)} caseId={caseId ? Number(caseId) : undefined} />
        </AppLayout>
    );
}
