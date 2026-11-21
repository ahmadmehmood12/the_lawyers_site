import { useState } from 'react';
import { View } from 'react-native';

import { accountApi, errorMessage, fieldErrors } from '@/api';
import { Alert, Button, Input, Screen, SegmentedControl } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme';

export function EditProfileScreen() {
  const { user, setUser } = useAuth();
  const { spacing } = useTheme();
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', locale: user?.locale ?? 'en' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setErrors({});
    setNotice(null);
    try {
      const { data, message } = await accountApi.updateProfile(form);
      setUser(data);
      setNotice({ tone: 'success', text: data.email_verified ? message : 'Saved. Check your new email for a verification code.' });
    } catch (e) {
      const f = fieldErrors(e);
      setErrors(f);
      if (!Object.keys(f).length) { setNotice({ tone: 'danger', text: errorMessage(e) }); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]} footer={<Button title="Save changes" full size="lg" loading={busy} onPress={() => void save()} />}>
      <View style={{ gap: spacing.lg }}>
        {notice ? <Alert tone={notice.tone} message={notice.text} /> : null}
        <Input label="Full name" icon="user" value={form.name} onChangeText={(name) => setForm({ ...form, name })} error={errors.name} />
        <Input label="Email" icon="mail" value={form.email} onChangeText={(email) => setForm({ ...form, email })} autoCapitalize="none" keyboardType="email-address" error={errors.email} hint="Changing it needs a new verification code." />
        <Input label="Mobile" icon="phone" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} keyboardType="phone-pad" error={errors.phone} />
        <SegmentedControl<'en' | 'ur'> value={form.locale} onChange={(locale) => setForm({ ...form, locale })} options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} />
      </View>
    </Screen>
  );
}

export function ChangePasswordScreen() {
  const { spacing } = useTheme();
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setErrors({});
    setNotice(null);
    try {
      const { message } = await accountApi.updatePassword(form);
      setForm({ current_password: '', password: '', password_confirmation: '' });
      setNotice({ tone: 'success', text: message });
    } catch (e) {
      const f = fieldErrors(e);
      setErrors(f);
      if (!Object.keys(f).length) { setNotice({ tone: 'danger', text: errorMessage(e) }); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]} footer={<Button title="Update password" full size="lg" loading={busy} disabled={!form.current_password || !form.password} onPress={() => void save()} />}>
      <View style={{ gap: spacing.lg }}>
        {notice ? <Alert tone={notice.tone} message={notice.text} /> : null}
        <Input label="Current password" icon="lock" password value={form.current_password} onChangeText={(v) => setForm({ ...form, current_password: v })} error={errors.current_password} />
        <Input label="New password" icon="key" password value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} error={errors.password} hint="At least 8 characters with letters and numbers." />
        <Input label="Confirm new password" icon="key" password value={form.password_confirmation} onChangeText={(v) => setForm({ ...form, password_confirmation: v })} error={errors.password_confirmation} />
      </View>
    </Screen>
  );
}
