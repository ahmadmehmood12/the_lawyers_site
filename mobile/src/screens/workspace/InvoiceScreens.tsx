import { Feather } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { errorMessage, openFile, uuid, webPage, webPost, type LaravelPage, type Option } from '@/api';
import { Alert, Badge, Button, Card, Chip, DateField, EmptyState, ErrorState, FormScreen, Input, KeyValue, Loading, Picker, ReasonSheet, Screen, SectionHeader, SkeletonCard, Txt, useForm } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@/hooks/useQuery';
import { formatPkrExact } from '@/lib/format';
import { statusTone } from '@/lib/status';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

type InvoiceRow = { id: number; number: string; status: string; status_label: string; issue_date: string; due_date: string | null; total: string; balance: string; overdue: boolean; client: string; case_reference: string | null };
const pkr = (v: string | number | null | undefined) => formatPkrExact(Number(v ?? 0));

/** Invoices (web Invoices page): totals, status filter, list. */
export function WorkspaceInvoicesScreen() {
  const nav = useAppNavigation();
  const { spacing } = useTheme();
  const [status, setStatus] = useState('');
  const q = useQuery(() => webPage<{ invoices: LaravelPage<InvoiceRow>; summary: { outstanding: number; overdue: number; collected_month: number }; options: { statuses: Option[] }; can: { create?: boolean } }>('/workspace/invoices', { status: status || undefined }), [status]);
  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh} footer={<Button title="New invoice" icon="plus" full onPress={() => nav.navigate('InvoiceForm')} />}>
      {q.data ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          {[['Outstanding', q.data.summary.outstanding, 'warning'], ['Overdue', q.data.summary.overdue, 'danger'], ['Collected', q.data.summary.collected_month, 'success']].map(([l, v, tone]) => (
            <Card key={l as string} style={{ flex: 1 }}><Txt variant="caption" tone="muted">{l as string}</Txt><Txt variant="subtitle" tone={tone as 'warning'}>{pkr(v as number)}</Txt></Card>
          ))}
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        <Chip label="All" selected={!status} onPress={() => setStatus('')} />
        {q.data?.options?.statuses?.map((s) => <Chip key={s.value} label={s.label} selected={status === s.value} onPress={() => setStatus(String(s.value))} />)}
      </ScrollView>
      {q.loading ? <SkeletonCard /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : !q.data?.invoices.data.length ? <EmptyState icon="file-text" title="No invoices" /> : (
        <View style={{ gap: spacing.sm }}>
          {q.data.invoices.data.map((i) => (
            <Card key={i.id} onPress={() => nav.navigate('InvoiceDetail', { id: i.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt variant="subtitle">{i.number}</Txt><Badge label={i.status_label} tone={i.overdue ? 'danger' : statusTone(i.status)} /></View>
              <Txt variant="label" tone="muted" weight="500">{[i.client, i.case_reference].filter(Boolean).join(' · ')}</Txt>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
                <Txt variant="caption" tone="muted">Total {pkr(i.total)}</Txt>
                <Txt variant="label" tone={Number(i.balance) > 0 ? 'danger' : 'success'}>Balance {pkr(i.balance)}</Txt>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

type InvoicePage = { invoice: { id: number; number: string; status: string; status_label: string; issue_date: string; due_date: string | null; total: string; amount_paid: string; balance: string; subtotal: string; discount: string; tax_amount: string; notes: string | null; client?: { name: string; phone: string | null } ; organization?: { name: string }; case?: { title: string; reference?: string } | string | null; items: { description: string; quantity: string | number; unit_price: string; amount: string }[]; payments: { id: number; receipt_number: string; amount: string; paid_on: string; method?: string; method_label?: string }[] }; methods?: Option[]; can?: { issue: boolean; void: boolean; pay: boolean } };

/** One invoice — lawyers: issue, void, record payment; clients: view, PDF, receipts. Same web actions. */
export function InvoiceDetailScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'InvoiceDetail'>>();
  const { role } = useAuth();
  const nav = useAppNavigation();
  const client = role === 'client';
  const { c, spacing } = useTheme();
  const base = client ? '/client' : '/workspace';
  const q = useQuery(() => webPage<InvoicePage>(`${base}/invoices/${params.id}`), [params.id]);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const pay = useForm<Record<string, any>>({ amount: '', method: 'cash', paid_on: new Date().toISOString().slice(0, 10), reference: '', idempotency_key: uuid() });

  if (q.loading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  const i = q.data.invoice;
  const can = q.data.can ?? { issue: false, void: false, pay: false };
  const act = async (fn: () => Promise<{ message: string }>) => {
    try { const { message } = await fn(); setNotice({ tone: 'success', text: message }); void q.refresh(); } catch (e) { setNotice({ tone: 'danger', text: errorMessage(e) }); }
  };
  const caseLabel = typeof i.case === 'string' ? i.case : i.case?.reference ?? i.case?.title;

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="title">{i.number}</Txt>
        <Badge label={i.status_label} tone={statusTone(i.status)} />
      </View>
      <Txt tone="muted">{[client ? i.organization?.name : i.client?.name, caseLabel].filter(Boolean).join(' · ')}</Txt>
      {notice ? <View style={{ marginTop: spacing.md }}><Alert tone={notice.tone} message={notice.text} /></View> : null}
      <Card style={{ marginTop: spacing.lg }}>
        {i.items.map((it, n) => <KeyValue key={n} label={`${it.description} × ${Number(it.quantity)}`} value={pkr(it.amount)} />)}
        {Number(i.discount) > 0 ? <KeyValue label="Discount" value={`− ${pkr(i.discount)}`} /> : null}
        {Number(i.tax_amount) > 0 ? <KeyValue label="Tax" value={pkr(i.tax_amount)} /> : null}
        <KeyValue label="Total" value={pkr(i.total)} />
        <KeyValue label="Paid" value={pkr(i.amount_paid)} />
        <KeyValue label="Balance" value={pkr(i.balance)} last />
      </Card>
      <Txt variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>Issued {i.issue_date}{i.due_date ? ` · due ${i.due_date}` : ''}</Txt>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' }}>
        <Button title="PDF" icon="file-text" variant="secondary" onPress={() => nav.navigate('PdfViewer', { path: `${base}/invoices/${i.id}/pdf`, title: i.number })} />
        {can.issue && i.status === 'draft' ? <Button title="Issue" icon="send" onPress={() => void act(() => webPost(`/workspace/invoices/${i.id}/issue`))} /> : null}
        {can.pay && Number(i.balance) > 0 && i.status !== 'draft' && i.status !== 'void' ? <Button title="Record payment" icon="dollar-sign" onPress={() => { pay.setValues((v) => ({ ...v, amount: String(Number(i.balance)), idempotency_key: uuid() })); setPaying(true); }} /> : null}
        {can.void && i.status !== 'void' ? <Button title="Void" variant="ghost" onPress={() => setVoiding(true)} /> : null}
      </View>
      {paying ? (
        <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <SectionHeader title="Record payment" />
          {pay.message ? <Alert tone={pay.message.tone} message={pay.message.text} /> : null}
          <Input label="Amount (PKR) *" value={pay.values.amount} onChangeText={(t) => pay.set('amount', t)} keyboardType="decimal-pad" error={pay.errors.amount} />
          <Picker label="Method" required value={pay.values.method} options={q.data.methods ?? []} onChange={(x) => pay.set('method', x)} error={pay.errors.method} />
          <DateField label="Paid on" required value={pay.values.paid_on} onChange={(t) => pay.set('paid_on', t)} error={pay.errors.paid_on} quick={false} />
          <Input label="Reference (cheque / transaction no.)" value={pay.values.reference} onChangeText={(t) => pay.set('reference', t)} error={pay.errors.reference} />
          <Button title="Save payment" full loading={pay.busy} onPress={() => void pay.submit((v) => webPost(`/workspace/invoices/${i.id}/payments`, v), (r) => { setPaying(false); setNotice({ tone: 'success', text: r.message }); void q.refresh(); })} />
        </Card>
      ) : null}
      {i.payments.length ? (
        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <SectionHeader title="Payments" />
          {i.payments.map((p) => (
            <Pressable key={p.id} onPress={() => nav.navigate('PdfViewer', { path: client ? `/client/receipts/${p.id}` : `/workspace/payments/${p.id}/receipt`, title: p.receipt_number })}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Feather name="check-circle" size={18} color={c.success} />
                <View style={{ flex: 1 }}><Txt variant="label">{p.receipt_number} · {pkr(p.amount)}</Txt><Txt variant="caption" tone="muted">{p.paid_on} · {p.method_label ?? p.method}</Txt></View>
                <Feather name="download" size={16} color={c.textFaint} />
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}
      <ReasonSheet visible={voiding} title="Void this invoice?" confirmLabel="Void invoice" danger onClose={() => setVoiding(false)} onSubmit={async (reason) => { setVoiding(false); await act(() => webPost(`/workspace/invoices/${i.id}/void`, { reason })); }} />
    </Screen>
  );
}

type Item = { type: string; description: string; quantity: string; unit_price: string };

/** New invoice (InvoiceRequest): client, case, dates, line items, discount / tax. Saved as a draft, like the web. */
export function InvoiceFormScreen() {
  const nav = useAppNavigation();
  const { spacing } = useTheme();
  const q = useQuery(() => webPage<{ options: { clients: Option<number>[]; cases: Option<number>[] } }>('/workspace/invoices/create'));
  const today = new Date().toISOString().slice(0, 10);
  const f = useForm<Record<string, any>>({ client_id: null, legal_case_id: null, issue_date: today, due_date: '', discount: '0', tax_rate: '0', notes: '', items: [{ type: 'fee', description: 'Professional fee', quantity: '1', unit_price: '' }] as Item[] });
  if (q.loading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  const v = f.values;
  const items = v.items as Item[];
  const setItem = (n: number, patch: Partial<Item>) => f.set('items', items.map((it, i) => (i === n ? { ...it, ...patch } : it)));
  const total = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const types: Option[] = [{ value: 'fee', label: 'Fee' }, { value: 'consultation', label: 'Consultation' }, { value: 'expense', label: 'Expense' }, { value: 'other', label: 'Other' }];

  return (
    <FormScreen submitLabel="Save draft invoice" busy={f.busy} message={f.message} onSubmit={() => void f.submit((values) => webPost('/workspace/invoices', values), (r) => { nav.goBack(); if (r.params?.invoice) nav.navigate('InvoiceDetail', { id: Number(r.params.invoice) }); })}>
      <Picker label="Client" required value={v.client_id} options={q.data.options.clients} onChange={(x) => f.set('client_id', x)} error={f.errors.client_id} />
      <Picker label="Case" value={v.legal_case_id} options={q.data.options.cases} onChange={(x) => f.set('legal_case_id', x)} error={f.errors.legal_case_id} />
      <DateField label="Issue date" required value={v.issue_date} onChange={(t) => f.set('issue_date', t)} error={f.errors.issue_date} quick={false} />
      <DateField label="Due date" value={v.due_date} onChange={(t) => f.set('due_date', t)} error={f.errors.due_date} />
      <SectionHeader title="Items" actionLabel="Add item" onAction={() => f.set('items', [...items, { type: 'fee', description: '', quantity: '1', unit_price: '' }])} />
      {items.map((it, n) => (
        <Card key={n} style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt variant="label">Item {n + 1}</Txt>
            {items.length > 1 ? <Pressable onPress={() => f.set('items', items.filter((_, i) => i !== n))} hitSlop={8}><Txt variant="label" tone="danger">Remove</Txt></Pressable> : null}
          </View>
          <Picker label="Type" required value={it.type} options={types} onChange={(x) => setItem(n, { type: x })} error={f.errors[`items.${n}.type`]} />
          <Input label="Description" value={it.description} onChangeText={(t) => setItem(n, { description: t })} error={f.errors[`items.${n}.description`]} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}><Input label="Qty" value={it.quantity} onChangeText={(t) => setItem(n, { quantity: t })} keyboardType="decimal-pad" error={f.errors[`items.${n}.quantity`]} /></View>
            <View style={{ flex: 2 }}><Input label="Unit price (PKR)" value={it.unit_price} onChangeText={(t) => setItem(n, { unit_price: t })} keyboardType="decimal-pad" error={f.errors[`items.${n}.unit_price`]} /></View>
          </View>
        </Card>
      ))}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}><Input label="Discount (PKR)" value={v.discount} onChangeText={(t) => f.set('discount', t)} keyboardType="decimal-pad" error={f.errors.discount} /></View>
        <View style={{ flex: 1 }}><Input label="Tax %" value={v.tax_rate} onChangeText={(t) => f.set('tax_rate', t)} keyboardType="decimal-pad" error={f.errors.tax_rate} /></View>
      </View>
      <Txt variant="subtitle">Subtotal {pkr(total)}</Txt>
      <Input label="Notes" value={v.notes} onChangeText={(t) => f.set('notes', t)} error={f.errors.notes} multiline />
    </FormScreen>
  );
}
