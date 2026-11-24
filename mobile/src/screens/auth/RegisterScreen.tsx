import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { authApi, errorMessage, fieldErrors, type Option } from '@/api';
import { Alert, Button, Chip, Input, SegmentedControl, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useAuthNavigation, type AuthStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';
import { AuthShell } from './AuthShell';
import { GoogleButton } from './GoogleButton';

type Kind = 'client' | 'lawyer' | 'firm';

/** Sign-up for clients, advocates and law firms — same fields and rules as the website. */
export function RegisterScreen() {
  const nav = useAuthNavigation();
  const { params } = useRoute<RouteProp<AuthStackParamList, 'Register'>>();
  const viaGoogle = !!params?.googleToken;
  const { register } = useAuth();
  const { c, spacing } = useTheme();
  const [kind, setKind] = useState<Kind>('client');
  const [form, setForm] = useState<Record<string, string>>(viaGoogle ? { name: params?.name ?? '', email: params?.email ?? '' } : {});
  const [barCouncils, setBarCouncils] = useState<Option<number>[]>([]);
  const [barCouncil, setBarCouncil] = useState<number | null>(null);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const professional = kind !== 'client';

  useEffect(() => {
    authApi.registerOptions().then((o) => setBarCouncils(o.bar_councils)).catch(() => undefined);
  }, []);

  const field = (key: string) => ({ value: form[key] ?? '', onChangeText: (v: string) => setForm((f) => ({ ...f, [key]: v })), error: errors[key] });

  const submit = async () => {
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      await register({ ...form, registration_type: kind, bar_council_id: barCouncil, terms, google_token: params?.googleToken });
    } catch (e) {
      const fields = fieldErrors(e);
      setErrors(fields);
      setMessage(Object.keys(fields).length ? 'Please check the highlighted fields.' : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell compact title="Create account" subtitle="Find lawyers, or run your practice.">
      <SegmentedControl<Kind>
        value={kind}
        onChange={setKind}
        options={[{ value: 'client', label: 'Client' }, { value: 'lawyer', label: 'Advocate' }, { value: 'firm', label: 'Law firm' }]}
      />
      {message ? <Alert tone="danger" message={message} /> : null}
      <Input label="Full name" icon="user" {...field('name')} autoComplete="name" />
      <Input label="Email" icon="mail" {...field('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!viaGoogle} hint={viaGoogle ? 'Confirmed by Google — no password needed.' : undefined} />
      <Input label="Mobile number" icon="phone" {...field('phone')} keyboardType="phone-pad" placeholder="03XX XXXXXXX" />
      {kind === 'firm' ? (
        <>
          <Input label="Firm name" icon="briefcase" {...field('firm_name')} />
          <Input label="Firm registration number" icon="hash" {...field('firm_registration_number')} />
        </>
      ) : null}
      {professional ? (
        <>
          <Input label="CNIC" icon="credit-card" {...field('cnic')} keyboardType="number-pad" placeholder="35202-1234567-1" />
          <View style={{ gap: spacing.sm }}>
            <Txt variant="label">Bar Council</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {barCouncils.map((b) => <Chip key={b.value} label={b.label} selected={barCouncil === b.value} onPress={() => setBarCouncil(b.value)} />)}
            </ScrollView>
            {errors.bar_council_id ? <Txt variant="caption" tone="danger">{errors.bar_council_id}</Txt> : null}
          </View>
          <Input label="Enrollment / licence number" icon="award" {...field('enrollment_number')} />
          {kind === 'lawyer' ? <Input label="Firm invite code (optional)" icon="users" {...field('firm_invite_code')} autoCapitalize="characters" /> : null}
        </>
      ) : null}
      {!viaGoogle ? (
        <>
          <Input label="Password" icon="lock" {...field('password')} password hint="At least 8 characters with letters and numbers." />
          <Input label="Confirm password" icon="lock" {...field('password_confirmation')} password />
        </>
      ) : null}
      <Input label="Referral code (optional)" icon="gift" {...field('referral_code')} autoCapitalize="characters" />
      <Pressable onPress={() => setTerms(!terms)} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }} hitSlop={6}>
        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: terms ? c.primary : c.borderStrong, backgroundColor: terms ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {terms ? <Feather name="check" size={14} color={c.primaryText} /> : null}
        </View>
        <Txt variant="label" tone="muted" style={{ flex: 1 }}>I agree to the Terms of Service and Privacy Policy</Txt>
      </Pressable>
      {errors.terms ? <Txt variant="caption" tone="danger">{errors.terms}</Txt> : null}
      <Button title="Create account" onPress={() => void submit()} loading={busy} disabled={!terms} full size="lg" />
      {!viaGoogle ? <GoogleButton onError={setMessage} /> : null}
      <Pressable onPress={() => nav.goBack()} style={{ alignSelf: 'center' }} hitSlop={8}>
        <Txt variant="label" tone="accent">I already have an account</Txt>
      </Pressable>
    </AuthShell>
  );
}
