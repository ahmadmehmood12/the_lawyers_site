import { Stagger, StaggerItem } from '@/Components/motion';
import { useT } from '@/lib/i18n';

/**
 * Statute references often cited in drafts, shown as an animated index. Section numbers and
 * headings are the statutes' own (PPC 1860, CrPC 1898, Constitution 1973); no case law.
 */
export function LegalReferences() {
    const t = useT();
    const refs = [
        ['CrPC', '154', t('Information in cognizable cases (FIR)')],
        ['CrPC', '22-A', t('Powers of the Justice of Peace')],
        ['CrPC', '497', t('Bail in non-bailable offences')],
        ['CrPC', '498', t('Bail by the High Court or Court of Session')],
        ['PPC', '420', t('Cheating and dishonestly inducing delivery of property')],
        ['PPC', '489-F', t('Dishonestly issuing a cheque')],
        ['PPC', '506', t('Criminal intimidation')],
        ['Constitution', 'Art. 199', t('Jurisdiction of the High Court (writs)')],
    ];
    return (
        <Stagger as="ul" className="mt-8 grid gap-2 sm:grid-cols-2" gap={0.05}>
            {refs.map(([code, section, title]) => (
                <StaggerItem key={code + section} as="li" className="flex items-baseline gap-3 rounded-lg border border-navy-100 bg-white px-3 py-2 dark:border-navy-800 dark:bg-navy-900">
                    <span className="ltr-nums shrink-0 rounded bg-navy-900 px-1.5 py-0.5 text-[11px] font-semibold text-gold-300 tabular-nums dark:bg-gold-500 dark:text-navy-950">{code} {section}</span>
                    <span className="text-sm text-navy-700 dark:text-navy-200">{title}</span>
                </StaggerItem>
            ))}
        </Stagger>
    );
}
