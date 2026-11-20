import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Card, EmptyState, ListRow, Screen, SegmentedControl, Stat, Txt } from '@/components';
import { invoices, payments } from '@/data/mock';
import { formatPkr, formatPkrExact, formatDate, titleCase } from '@/lib/format';
import { invoiceTone, label } from '@/lib/status';
import { useTheme } from '@/theme';

export function FinanceScreen() {
  const { spacing } = useTheme();
  const [tab, setTab] = useState<'invoices' | 'receipts'>('invoices');

  const billed = invoices.reduce((n, i) => n + i.amount, 0);
  const received = invoices.reduce((n, i) => n + i.paid, 0);
  const outstanding = billed - received;

  return (
    <Screen>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>
        Finance
      </Txt>

      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat value={formatPkr(billed)} label="Billed" />
          <Stat value={formatPkr(received)} label="Received" deltaTone="success" />
        </View>
        <Stat value={formatPkr(outstanding)} label="Outstanding" delta={`${invoices.filter((i) => i.status !== 'paid').length} open invoices`} deltaTone="danger" />
      </View>

      <View style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'invoices', label: 'Invoices' },
            { value: 'receipts', label: 'Receipts' },
          ]}
        />
      </View>

      {tab === 'invoices' ? (
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          {invoices.map((inv, i) => (
            <ListRow
              key={inv.id}
              title={inv.clientName}
              subtitle={`${inv.number} · due ${formatDate(inv.dueOn)}`}
              trailing={
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Txt variant="body" weight="700">
                    {formatPkrExact(inv.amount)}
                  </Txt>
                  <Badge label={label(inv.status)} tone={invoiceTone(inv.status)} />
                </View>
              }
              divider={i < invoices.length - 1}
              chevron
            />
          ))}
        </Card>
      ) : payments.length === 0 ? (
        <EmptyState icon="credit-card" title="No receipts yet" />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          {payments.map((p, i) => (
            <ListRow
              key={p.id}
              title={p.clientName}
              subtitle={`${p.receiptNumber} · ${titleCase(p.method)} · ${formatDate(p.date)}`}
              trailing={
                <Txt variant="body" weight="700" tone="success">
                  {formatPkrExact(p.amount)}
                </Txt>
              }
              divider={i < payments.length - 1}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
