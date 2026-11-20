import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, EmptyState, ListRow, Screen, SegmentedControl, Stat, Txt } from '@/components';
import { currentClientName, invoices, payments } from '@/data/mock';
import { formatPkr, formatPkrExact, formatDate, titleCase } from '@/lib/format';
import { invoiceTone, label } from '@/lib/status';
import { useTheme } from '@/theme';

export function ClientPaymentsScreen() {
  const { spacing } = useTheme();
  const [tab, setTab] = useState<'due' | 'history'>('due');

  const myInvoices = invoices.filter((i) => i.clientName === currentClientName);
  const myPayments = payments.filter((p) => p.clientName === currentClientName);
  const due = myInvoices.filter((i) => i.status !== 'paid').reduce((n, i) => n + (i.amount - i.paid), 0);

  return (
    <Screen>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>
        Payments
      </Txt>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat value={formatPkr(due)} label="Amount due" deltaTone={due > 0 ? 'danger' : 'muted'} />
        <Stat value={formatPkr(myPayments.reduce((n, p) => n + p.amount, 0))} label="Paid to date" deltaTone="success" />
      </View>

      <View style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'due', label: 'Invoices' },
            { value: 'history', label: 'History' },
          ]}
        />
      </View>

      {tab === 'due' ? (
        myInvoices.length === 0 ? (
          <EmptyState icon="file-text" title="No invoices" />
        ) : (
          <View style={{ gap: spacing.md }}>
            {myInvoices.map((inv) => (
              <Card key={inv.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt variant="caption" tone="faint">
                    {inv.number}
                  </Txt>
                  <Badge label={label(inv.status)} tone={invoiceTone(inv.status)} />
                </View>
                {inv.items.map((it) => (
                  <View key={it.description} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
                    <Txt variant="caption" tone="muted" style={{ flex: 1 }}>
                      {it.description}
                    </Txt>
                    <Txt variant="caption">{formatPkrExact(it.amount)}</Txt>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'transparent' }}>
                  <Txt variant="body" weight="700">
                    Total
                  </Txt>
                  <Txt variant="body" weight="700">
                    {formatPkrExact(inv.amount)}
                  </Txt>
                </View>
                {inv.status !== 'paid' ? <Button title={`Pay ${formatPkrExact(inv.amount - inv.paid)}`} icon="credit-card" onPress={() => {}} full style={{ marginTop: spacing.md }} /> : null}
              </Card>
            ))}
          </View>
        )
      ) : myPayments.length === 0 ? (
        <EmptyState icon="credit-card" title="No payments yet" />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          {myPayments.map((p, i) => (
            <ListRow
              key={p.id}
              title={formatPkrExact(p.amount)}
              subtitle={`${p.receiptNumber} · ${titleCase(p.method)} · ${formatDate(p.date)}`}
              trailing={<Badge label="Receipt" tone="success" />}
              divider={i < myPayments.length - 1}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
