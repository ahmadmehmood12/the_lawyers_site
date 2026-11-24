import { useRoute, type RouteProp } from '@react-navigation/native';
import { useEffect } from 'react';

import { webPage, webPost, webPut, type Option } from '@/api';
import { ErrorState, FormScreen, Input, Loading, Picker, Screen, SegmentedControl, SwitchRow, useForm } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';

/** New / edit client — the web's client form (ClientRequest). */
export function ClientFormScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'ClientForm'>>();
  const nav = useAppNavigation();
  const id = params?.id;
  const q = useQuery(() => webPage<{ client: Record<string, any> | null; cities: Option<number>[] }>(id ? `/workspace/clients/${id}/edit` : '/workspace/clients/create'), [id]);
  const f = useForm<Record<string, any>>({ type: 'individual', name: '', company_name: '', phone: '', whatsapp: '', email: '', cnic: '', ntn: '', address: '', city_id: null, preferred_locale: 'en', notes: '', whatsapp_consent: false });

  useEffect(() => {
    if (q.data?.client) {
      f.setValues((v) => ({ ...v, ...Object.fromEntries(Object.entries(q.data!.client!).filter(([k]) => k in v).map(([k, x]) => [k, x ?? (typeof v[k] === 'string' ? '' : x)])) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  if (q.loading) {
    return <Loading />;
  }
  if (q.error || !q.data) {
    return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  }
  const v = f.values;
  const e = f.errors;

  return (
    <FormScreen submitLabel={id ? 'Save client' : 'Add client'} busy={f.busy} message={f.message} onSubmit={() => void f.submit(
      (values) => (id ? webPut(`/workspace/clients/${id}`, values) : webPost('/workspace/clients', values)),
      (r) => { const clientId = Number(r.params?.client ?? id); nav.goBack(); if (!id && clientId) { nav.navigate('ClientDetail', { id: clientId }); } },
    )}>
      <SegmentedControl value={v.type} onChange={(x) => f.set('type', x)} options={[{ value: 'individual', label: 'Individual' }, { value: 'business', label: 'Business' }]} />
      <Input label="Full name *" icon="user" value={v.name} onChangeText={(t) => f.set('name', t)} error={e.name} />
      {v.type === 'business' ? (
        <>
          <Input label="Company name *" icon="briefcase" value={v.company_name ?? ''} onChangeText={(t) => f.set('company_name', t)} error={e.company_name} />
          <Input label="NTN" value={v.ntn ?? ''} onChangeText={(t) => f.set('ntn', t)} error={e.ntn} />
        </>
      ) : null}
      <Input label="Mobile" icon="phone" value={v.phone ?? ''} onChangeText={(t) => f.set('phone', t)} error={e.phone} keyboardType="phone-pad" placeholder="03XX XXXXXXX" />
      <Input label="WhatsApp" icon="message-circle" value={v.whatsapp ?? ''} onChangeText={(t) => f.set('whatsapp', t)} error={e.whatsapp} keyboardType="phone-pad" />
      <Input label="Email" icon="mail" value={v.email ?? ''} onChangeText={(t) => f.set('email', t)} error={e.email} keyboardType="email-address" autoCapitalize="none" />
      <Input label="CNIC" icon="credit-card" value={v.cnic ?? ''} onChangeText={(t) => f.set('cnic', t)} error={e.cnic} keyboardType="number-pad" placeholder="35202-1234567-1" />
      <Picker label="City" value={v.city_id} options={q.data.cities} onChange={(x) => f.set('city_id', x)} error={e.city_id} />
      <Input label="Address" value={v.address ?? ''} onChangeText={(t) => f.set('address', t)} error={e.address} />
      <Picker label="Language for messages" required value={v.preferred_locale} options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} onChange={(x) => f.set('preferred_locale', x)} error={e.preferred_locale} />
      <SwitchRow label="WhatsApp consent" hint="The client agreed to hearing and appointment reminders on WhatsApp." value={!!v.whatsapp_consent} onChange={(x) => f.set('whatsapp_consent', x)} />
      <Input label="Notes" value={v.notes ?? ''} onChangeText={(t) => f.set('notes', t)} error={e.notes} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
    </FormScreen>
  );
}
