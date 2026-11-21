# Authentication

- Laravel Sanctum bearer token from `POST /api/v1/auth/login` (same password check and suspended-account rule as the web). Stored only in `expo-secure-store` (`wd.token`); `AuthContext` restores it on launch via `GET /auth/me`.
- Two-factor: login returns `{two_factor: true, challenge_token}` → `TwoFactorScreen` (6-digit authenticator code or recovery code) → token.
- Sign-up: `RegisterScreen` (client / advocate / law firm; CNIC, Bar Council, enrollment for professionals) → token → `VerifyEmailScreen` (6-digit emailed code) gates the app until `email_verified`.
- Forgot password: email → `ResetCodeScreen` (code, resend with cooldown) → `NewPasswordScreen` (all tokens revoked server-side).
- 2FA management: Account → Two-factor (password → key + otpauth link → confirm code → recovery codes; show/disable with password).
- Biometric lock (optional, `wd.biometric`): locks when the app goes to background; unlock with Face ID / fingerprint.
- Logout: `POST /auth/logout` revokes the token and the push token.

## Push
`src/lib/push.ts` asks permission after sign-in and registers the device with `POST /api/v1/account/device-token`:
- with an EAS `projectId` (`app.json` `extra.eas.projectId`) → Expo push token (iOS + Android, sent by the backend through Expo's free push service);
- without one, on Android → raw FCM token (backend sends through FCM HTTP v1 with the service account saved in Admin → Settings → Mobile app).
Remote push does not work in Expo Go — use a development build (`eas build --profile development`). Android needs `google-services.json` (add `"googleServicesFile": "./google-services.json"` under `android` in `app.json`). The admin "push enabled" switch must be on.
