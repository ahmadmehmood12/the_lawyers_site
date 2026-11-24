import { FontAwesome } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';

import { errorMessage, fieldErrors } from '@/api';
import { Txt } from '@/components';
import { useConfig } from '@/context/AppConfigContext';
import { useAuth } from '@/context/AuthContext';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

WebBrowser.maybeCompleteAuthSession();

/**
 * "Continue with Google" — the OAuth client ids come from Admin > Settings > Mobile app (GET /api/app/config).
 * The Google ID token is verified by the server (POST /api/v1/auth/google), which then signs in an
 * existing account (two-factor still applies) or starts sign-up with the Google profile, like the web.
 * Needs a development / store build (Google does not accept Expo Go's redirect).
 */
export function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const { config } = useConfig();
  const g = config?.google;
  const clientId = Platform.OS === 'ios' ? g?.ios_client_id : Platform.OS === 'android' ? g?.android_client_id : g?.web_client_id;
  if (!g?.enabled || !clientId) {
    return null;
  }
  return <GoogleButtonInner iosClientId={g.ios_client_id ?? undefined} androidClientId={g.android_client_id ?? undefined} webClientId={g.web_client_id ?? undefined} onError={onError} />;
}

function GoogleButtonInner({ iosClientId, androidClientId, webClientId, onError }: { iosClientId?: string; androidClientId?: string; webClientId?: string; onError: (message: string) => void }) {
  const { c, radius, spacing } = useTheme();
  const nav = useAppNavigation();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [request, response, prompt] = Google.useIdTokenAuthRequest({ iosClientId, androidClientId, webClientId, selectAccount: true });

  useEffect(() => {
    if (response?.type !== 'success') {
      if (response?.type === 'error') onError('Google sign in was cancelled or did not finish. Please try again.');
      return;
    }
    const idToken = response.params.id_token ?? response.authentication?.idToken;
    if (!idToken) return;
    setBusy(true);
    signInWithGoogle(idToken)
      .then((outcome) => {
        if (outcome.kind === 'two_factor') nav.navigate('TwoFactor', { challenge: outcome.challenge });
        if (outcome.kind === 'signup') nav.navigate('Register', { googleToken: outcome.token, name: outcome.name, email: outcome.email });
      })
      .catch((e) => onError(fieldErrors(e).id_token ?? errorMessage(e)))
      .finally(() => setBusy(false));
  }, [response]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <Txt variant="caption" tone="faint">or</Txt>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </View>
      <Pressable disabled={!request || busy} onPress={() => void prompt()} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface, opacity: request ? 1 : 0.6 }}>
        {busy ? <ActivityIndicator color={c.primary} /> : <FontAwesome name="google" size={18} color="#DB4437" />}
        <Txt weight="600">Continue with Google</Txt>
      </Pressable>
    </View>
  );
}
