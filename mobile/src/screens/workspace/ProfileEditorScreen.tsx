import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { errorMessage, formData, webDelete, webPage, webPost, webPut, type Option } from '@/api';
import { Alert, Avatar, Badge, Button, Card, Chip, DateField, EmptyState, ErrorState, FormScreen, Input, Loading, Picker, Screen, SectionHeader, SwitchRow, Txt, useForm } from '@/components';
import { useQuery } from '@/hooks/useQuery';
import { statusTone } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

type Step = 'identity' | 'enrollment' | 'qualifications' | 'practice' | 'chamber' | 'publish';
const STEP_LABELS: Record<Step, string> = { identity: 'Identity', enrollment: 'Enrollment', qualifications: 'Qualifications', practice: 'Practice', chamber: 'Chamber', publish: 'Publish' };
const TITLES = ['Mr.', 'Ms.', 'Mrs.', 'Barrister', 'Advocate', 'Mian', 'Syed', 'Rao', 'Ch.', 'Malik', 'Raja', 'Sardar'];
type Opt = Option<number> & { province_id?: number; district_id?: number };
type ProfilePage = {
  step: Step; steps: Step[];
  profile: Record<string, any> & { photo_url: string | null; verification_status: string; verification_label: string; slug: string };
  options: { barCouncils: Opt[]; categories: Option[]; specializations: Opt[]; courts: Opt[]; provinces: Opt[]; districts: Opt[]; tehsils: Opt[]; cities: Opt[]; languages: string[] };
};
const FIELDS: Record<Step, string[]> = {
  identity: ['title', 'cnic', 'headline', 'bio', 'bio_ur'],
  enrollment: ['bar_council_id', 'enrollment_number', 'advocate_category', 'enrollment_date', 'practice_since'],
  qualifications: ['educations', 'experiences', 'credentials'],
  practice: ['specialization_ids', 'primary_specialization_id', 'court_ids', 'languages'],
  chamber: ['province_id', 'district_id', 'tehsil_id', 'city_id', 'chamber_address', 'public_phone', 'public_email', 'consultation_fee_min', 'consultation_fee_max', 'offers_online', 'offers_in_person', 'accepting_clients'],
  publish: ['is_public'],
};

/** "My public profile" (web /profile): the same six steps, rules and messages as LawyerProfileController. */
export function ProfileEditorScreen() {
  const nav = useAppNavigation();
  const { c, spacing } = useTheme();
  const q = useQuery(() => webPage<ProfilePage>('/workspace/profile'));
  const [step, setStep] = useState<Step>('identity');
  const f = useForm<Record<string, any>>({});

  useEffect(() => {
    if (q.data) {
      f.setValues({ ...q.data.profile, educations: q.data.profile.educations ?? [], experiences: q.data.profile.experiences ?? [], credentials: q.data.profile.credentials ?? [] });
      setStep((s) => (q.data!.steps.includes(s) && s !== 'identity' ? s : q.data!.step));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  if (q.loading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  const o = q.data.options;
  const v = f.values;
  const e = f.errors;
  const set = (k: string, x: unknown) => f.set(k, x);
  const list = (k: 'educations' | 'experiences' | 'credentials') => (v[k] ?? []) as Record<string, any>[];
  const setRow = (k: 'educations' | 'experiences' | 'credentials', i: number, patch: Record<string, any>) => set(k, list(k).map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const num = (x: string) => (x === '' ? null : Number(x.replace(/\D/g, '')));

  const pickPhoto = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    await f.submit(() => webPost('/workspace/profile/photo', formData({}, { field: 'photo', uri: a.uri, name: a.name, type: a.mimeType ?? 'image/jpeg' })), (r) => { f.setMessage({ tone: 'success', text: r.message }); void q.refresh(); });
  };

  return (
    <FormScreen submitLabel={`Save ${STEP_LABELS[step].toLowerCase()}`} busy={f.busy} message={f.message} onSubmit={() => void f.submit(
      (values) => webPut(`/workspace/profile/steps/${step}`, Object.fromEntries(FIELDS[step].map((k) => [k, values[k]]))),
      (r) => { f.setMessage({ tone: 'success', text: r.message }); void q.refresh(); },
    )}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Pressable onPress={() => void pickPhoto()}><Avatar name={String(v.title ?? '') || 'Me'} uri={q.data.profile.photo_url} size={64} /></Pressable>
        <View style={{ flex: 1, gap: 4 }}>
          <Badge label={q.data.profile.verification_label} tone={statusTone(q.data.profile.verification_status === 'approved' ? 'confirmed' : q.data.profile.verification_status)} />
          <Txt variant="caption" tone="accent" onPress={() => void pickPhoto()}>Change photo</Txt>
        </View>
        <Button title="Preview" icon="eye" size="sm" variant="secondary" onPress={() => nav.navigate('LawyerProfile', { slug: q.data!.profile.slug })} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {q.data.steps.map((s, i) => <Chip key={s} label={`${i + 1}. ${STEP_LABELS[s]}`} selected={step === s} onPress={() => setStep(s)} />)}
      </ScrollView>

      {step === 'identity' ? (
        <>
          <Picker label="Title" value={v.title} options={TITLES.map((t) => ({ value: t, label: t }))} onChange={(x) => set('title', x)} error={e.title} />
          <Input label="CNIC *" value={v.cnic ?? ''} onChangeText={(t) => set('cnic', t)} error={e.cnic} keyboardType="number-pad" placeholder="35202-1234567-1" />
          <Input label="Headline" value={v.headline ?? ''} onChangeText={(t) => set('headline', t)} error={e.headline} placeholder="e.g. Criminal & family lawyer, Lahore High Court" />
          <Input label="About you (English)" value={v.bio ?? ''} onChangeText={(t) => set('bio', t)} error={e.bio} multiline style={{ minHeight: 120, textAlignVertical: 'top' }} />
          <Input label="About you (اردو)" value={v.bio_ur ?? ''} onChangeText={(t) => set('bio_ur', t)} error={e.bio_ur} multiline style={{ minHeight: 100, textAlignVertical: 'top', textAlign: 'right' }} />
        </>
      ) : step === 'enrollment' ? (
        <>
          <Picker label="Bar Council" required value={v.bar_council_id} options={o.barCouncils} onChange={(x) => set('bar_council_id', x)} error={e.bar_council_id} />
          <Input label="Enrollment / licence number *" value={v.enrollment_number ?? ''} onChangeText={(t) => set('enrollment_number', t)} error={e.enrollment_number} />
          <Picker label="Advocate category" required value={v.advocate_category} options={o.categories} onChange={(x) => set('advocate_category', x)} error={e.advocate_category} />
          <DateField label="Enrollment date" value={v.enrollment_date} onChange={(t) => set('enrollment_date', t)} error={e.enrollment_date} quick={false} />
          <Input label="Practising since (year) *" value={v.practice_since ? String(v.practice_since) : ''} onChangeText={(t) => set('practice_since', num(t))} error={e.practice_since} keyboardType="number-pad" maxLength={4} />
        </>
      ) : step === 'qualifications' ? (
        <>
          <SectionHeader title="Education" actionLabel="Add" onAction={() => set('educations', [...list('educations'), { degree: '', institution: '', year: null }])} />
          {list('educations').length === 0 ? <EmptyState icon="book-open" title="No education added" /> : list('educations').map((r, i) => (
            <Card key={`ed${i}`} style={{ gap: spacing.sm }}>
              <Input label="Degree *" value={r.degree} onChangeText={(t) => setRow('educations', i, { degree: t })} error={e[`educations.${i}.degree`]} placeholder="e.g. LLB (Hons)" />
              <Input label="Institution *" value={r.institution} onChangeText={(t) => setRow('educations', i, { institution: t })} error={e[`educations.${i}.institution`]} />
              <Input label="Year" value={r.year ? String(r.year) : ''} onChangeText={(t) => setRow('educations', i, { year: num(t) })} error={e[`educations.${i}.year`]} keyboardType="number-pad" maxLength={4} />
              <Txt variant="label" tone="danger" onPress={() => set('educations', list('educations').filter((_, n) => n !== i))}>Remove</Txt>
            </Card>
          ))}
          <SectionHeader title="Experience" actionLabel="Add" onAction={() => set('experiences', [...list('experiences'), { position: '', organization: '', start_year: null, end_year: null, is_current: false, description: '' }])} />
          {list('experiences').map((r, i) => (
            <Card key={`ex${i}`} style={{ gap: spacing.sm }}>
              <Input label="Position *" value={r.position} onChangeText={(t) => setRow('experiences', i, { position: t })} error={e[`experiences.${i}.position`]} />
              <Input label="Organization *" value={r.organization} onChangeText={(t) => setRow('experiences', i, { organization: t })} error={e[`experiences.${i}.organization`]} />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}><Input label="From" value={r.start_year ? String(r.start_year) : ''} onChangeText={(t) => setRow('experiences', i, { start_year: num(t) })} error={e[`experiences.${i}.start_year`]} keyboardType="number-pad" maxLength={4} /></View>
                <View style={{ flex: 1 }}><Input label="To" value={r.end_year ? String(r.end_year) : ''} onChangeText={(t) => setRow('experiences', i, { end_year: num(t) })} error={e[`experiences.${i}.end_year`]} keyboardType="number-pad" maxLength={4} editable={!r.is_current} /></View>
              </View>
              <SwitchRow label="I work here now" value={!!r.is_current} onChange={(x) => setRow('experiences', i, { is_current: x, end_year: x ? null : r.end_year })} />
              <Input label="Description" value={r.description ?? ''} onChangeText={(t) => setRow('experiences', i, { description: t })} multiline />
              <Txt variant="label" tone="danger" onPress={() => set('experiences', list('experiences').filter((_, n) => n !== i))}>Remove</Txt>
            </Card>
          ))}
          <SectionHeader title="Publications, certifications & awards" actionLabel="Add" onAction={() => set('credentials', [...list('credentials'), { type: 'certification', title: '', issuer: '', year: null, url: '' }])} />
          {list('credentials').map((r, i) => (
            <Card key={`cr${i}`} style={{ gap: spacing.sm }}>
              <Picker label="Type" required value={r.type} options={[{ value: 'publication', label: 'Publication' }, { value: 'certification', label: 'Certification' }, { value: 'award', label: 'Award' }]} onChange={(x) => setRow('credentials', i, { type: x })} />
              <Input label="Title *" value={r.title} onChangeText={(t) => setRow('credentials', i, { title: t })} error={e[`credentials.${i}.title`]} />
              <Input label="Issuer" value={r.issuer ?? ''} onChangeText={(t) => setRow('credentials', i, { issuer: t })} />
              <Input label="Year" value={r.year ? String(r.year) : ''} onChangeText={(t) => setRow('credentials', i, { year: num(t) })} keyboardType="number-pad" maxLength={4} />
              <Input label="Link" value={r.url ?? ''} onChangeText={(t) => setRow('credentials', i, { url: t })} error={e[`credentials.${i}.url`]} autoCapitalize="none" />
              <Txt variant="label" tone="danger" onPress={() => set('credentials', list('credentials').filter((_, n) => n !== i))}>Remove</Txt>
            </Card>
          ))}
        </>
      ) : step === 'practice' ? (
        <>
          <Picker label="Practice areas (up to 8)" required multiple value={v.specialization_ids ?? []} options={o.specializations} onChange={(x) => set('specialization_ids', x)} error={e.specialization_ids} />
          <Picker label="Main practice area" value={v.primary_specialization_id} options={o.specializations.filter((s) => (v.specialization_ids ?? []).includes(s.value))} onChange={(x) => set('primary_specialization_id', x)} error={e.primary_specialization_id} />
          <Picker label="Courts you appear in" multiple value={v.court_ids ?? []} options={o.courts} onChange={(x) => set('court_ids', x)} error={e.court_ids} />
          <Picker label="Languages" required multiple value={v.languages ?? []} options={o.languages.map((l) => ({ value: l, label: l }))} onChange={(x) => set('languages', x)} error={e.languages} />
        </>
      ) : step === 'chamber' ? (
        <>
          <Picker label="Province" required value={v.province_id} options={o.provinces} onChange={(x) => f.setValues((s) => ({ ...s, province_id: x, district_id: null, tehsil_id: null, city_id: null }))} error={e.province_id} />
          <Picker label="District" required value={v.district_id} options={o.districts.filter((d) => d.province_id === v.province_id)} onChange={(x) => f.setValues((s) => ({ ...s, district_id: x, tehsil_id: null, city_id: null }))} error={e.district_id} />
          <Picker label="Tehsil" value={v.tehsil_id} options={o.tehsils.filter((t) => t.district_id === v.district_id)} onChange={(x) => set('tehsil_id', x)} error={e.tehsil_id} />
          <Picker label="City" required value={v.city_id} options={o.cities.filter((ci) => ci.district_id === v.district_id)} onChange={(x) => set('city_id', x)} error={e.city_id} />
          <Input label="Chamber address *" value={v.chamber_address ?? ''} onChangeText={(t) => set('chamber_address', t)} error={e.chamber_address} />
          <Input label="Public phone" value={v.public_phone ?? ''} onChangeText={(t) => set('public_phone', t)} error={e.public_phone} keyboardType="phone-pad" />
          <Input label="Public email" value={v.public_email ?? ''} onChangeText={(t) => set('public_email', t)} error={e.public_email} keyboardType="email-address" autoCapitalize="none" />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}><Input label="Fee from (PKR)" value={v.consultation_fee_min != null ? String(v.consultation_fee_min) : ''} onChangeText={(t) => set('consultation_fee_min', num(t))} error={e.consultation_fee_min} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label="Fee to (PKR)" value={v.consultation_fee_max != null ? String(v.consultation_fee_max) : ''} onChangeText={(t) => set('consultation_fee_max', num(t))} error={e.consultation_fee_max} keyboardType="number-pad" /></View>
          </View>
          <SwitchRow label="Online consultations" value={!!v.offers_online} onChange={(x) => set('offers_online', x)} />
          <SwitchRow label="In-person consultations" value={!!v.offers_in_person} onChange={(x) => set('offers_in_person', x)} />
          <SwitchRow label="Accepting new clients" value={!!v.accepting_clients} onChange={(x) => set('accepting_clients', x)} />
        </>
      ) : (
        <>
          <SwitchRow label="Show my profile in the public directory" hint="Clients can find you, read your profile and book consultations." value={!!v.is_public} onChange={(x) => set('is_public', x)} />
          <Card onPress={() => nav.navigate('Verification')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderColor: c.border }}>
            <View style={{ flex: 1 }}><Txt variant="subtitle">Verification</Txt><Txt variant="caption" tone="muted">Upload your licence and CNIC to get the verified badge.</Txt></View>
            <Badge label={q.data.profile.verification_label} tone={q.data.profile.verification_status === 'approved' ? 'success' : 'warning'} />
          </Card>
        </>
      )}
    </FormScreen>
  );
}

type Verification = { verification: { id: number; status: string; status_label: string; editable: boolean; submitted_at: string | null; information_requested: string | null; reviewer_notes: string | null; documents: { id: number; type: string; type_label?: string; original_name?: string; created_at?: string }[] } | null; profileComplete: boolean; documentTypes: string[] };

/** Verification documents + submit for review (web Profile > Verification, VerificationController). */
export function VerificationScreen() {
  const { spacing } = useTheme();
  const q = useQuery(() => webPage<Verification>('/workspace/profile/verification'));
  const [type, setType] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (q.loading) return <Loading />;
  if (q.error || !q.data) return <Screen><ErrorState message={q.error ?? undefined} onRetry={q.reload} /></Screen>;
  const ver = q.data.verification;
  const run = async (fn: () => Promise<{ message: string }>) => {
    setBusy(true);
    try { const { message } = await fn(); setNotice({ tone: 'success', text: message }); void q.refresh(); } catch (e) { setNotice({ tone: 'danger', text: errorMessage(e) }); } finally { setBusy(false); }
  };
  const upload = async () => {
    if (!type) return;
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    await run(() => webPost('/workspace/profile/verification/documents', formData({ type }, { field: 'file', uri: a.uri, name: a.name, type: a.mimeType ?? 'application/pdf' })));
  };
  const label = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

  return (
    <Screen edges={[]} refreshing={q.refreshing} onRefresh={q.refresh}>
      {ver ? <Badge label={ver.status_label} tone={ver.status === 'approved' ? 'success' : ver.status === 'rejected' ? 'danger' : 'warning'} /> : null}
      {notice ? <View style={{ marginTop: spacing.md }}><Alert tone={notice.tone} message={notice.text} /></View> : null}
      {ver?.information_requested ? <View style={{ marginTop: spacing.md }}><Alert tone="warning" title="More information requested" message={ver.information_requested} /></View> : null}
      {!q.data.profileComplete ? <View style={{ marginTop: spacing.md }}><Alert tone="info" message="Complete the Enrollment step of your profile before submitting." /></View> : null}
      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <SectionHeader title="Documents" />
        {ver?.documents.length ? ver.documents.map((d) => (
          <Card key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1 }}><Txt variant="label">{d.type_label ?? label(d.type)}</Txt><Txt variant="caption" tone="muted" numberOfLines={1}>{d.original_name ?? ''}</Txt></View>
            {ver.editable ? <Txt variant="label" tone="danger" onPress={() => void run(() => webDelete(`/workspace/profile/verification/documents/${d.id}`))}>Remove</Txt> : null}
          </Card>
        )) : <EmptyState icon="shield" title="No documents yet" message="Upload your Bar Council licence and CNIC." />}
      </View>
      {!ver || ver.editable ? (
        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Picker label="Document type" required value={type} options={q.data.documentTypes.map((t) => ({ value: t, label: label(t) }))} onChange={setType} />
          <Button title="Upload document" icon="upload" disabled={!type} loading={busy} onPress={() => void upload()} />
          <Button title="Submit for verification" icon="send" variant="secondary" disabled={!q.data.profileComplete || !ver?.documents.length} loading={busy} onPress={() => void run(() => webPost('/workspace/profile/verification/submit'))} />
        </View>
      ) : null}
    </Screen>
  );
}
