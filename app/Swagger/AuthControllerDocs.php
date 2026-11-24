<?php

namespace App\Swagger;

/**
 * Authentication: login (with 2FA challenge), registration, password reset by 6-digit code, email verification, logout. Same Fortify actions as the web app.
 *
 * @OA\Post(
 *     path="/api/v1/auth/login",
 *     summary="Sign in",
 *     description="Email + password sign-in. If the account has two-factor authentication on, returns two_factor=true and a challenge_token (valid 10 minutes) instead of a token; finish with /auth/two-factor-challenge. Suspended accounts are refused. Throttled 5/min per email+IP.",
 *     operationId="authLogin",
 *     tags={"Auth"},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Sign in payload",
 *
 *         @OA\JsonContent(
 *             required={"email", "password"},
 *
 *             @OA\Property(property="email", type="string", example="client@wakeel.test"),
 *             @OA\Property(property="password", type="string", example="password"),
 *             @OA\Property(property="device_name", type="string", example="Pixel 8")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Signed in.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Signed in."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="two_factor", type="boolean", example=false),
 *                 @OA\Property(property="token", type="string", example="12|Xk9…"),
 *                 @OA\Property(property="token_type", type="string", example="Bearer"),
 *                 @OA\Property(property="user", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="These credentials do not match our records."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="email", type="array", @OA\Items(type="string", example="These credentials do not match our records."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=429,
 *         description="Too many attempts",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Too Many Attempts."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Post(
 *     path="/api/v1/auth/google",
 *     summary="Continue with Google",
 *     description="Send the Google ID token from the app's Google sign-in. Existing account: signs in (or returns a two-factor challenge). New email: returns google_signup=true with a signup_token (30 min) to send as google_token to /auth/register (no password needed). 404 when Google sign-in is disabled in Admin.",
 *     operationId="authGoogle",
 *     tags={"Auth"},
 *     @OA\RequestBody(required=true, @OA\JsonContent(required={"id_token"},
 *         @OA\Property(property="id_token", type="string", example="eyJhbGciOiJSUzI1NiIs…"),
 *         @OA\Property(property="device_name", type="string", example="iPhone 16")
 *     )),
 *     @OA\Response(response=200, description="Signed in, two-factor challenge, or sign-up needed", @OA\JsonContent(type="object",
 *         @OA\Property(property="status", type="string", example="Success"),
 *         @OA\Property(property="message", type="string", example="Signed in."),
 *         @OA\Property(property="data", type="object",
 *             @OA\Property(property="token", type="string", example="12|Xk9…"),
 *             @OA\Property(property="two_factor", type="boolean", example=false),
 *             @OA\Property(property="google_signup", type="boolean", example=false),
 *             @OA\Property(property="signup_token", type="string", example="eyJpdiI6…")
 *         ))),
 *     @OA\Response(response=404, description="Google sign-in is not enabled"),
 *     @OA\Response(response=422, description="Invalid token, unverified email or suspended account", @OA\JsonContent(type="object",
 *         @OA\Property(property="status", type="string", example="Failed"),
 *         @OA\Property(property="message", type="string", example="Your Google account has no verified email address."),
 *         @OA\Property(property="errors", type="object", @OA\Property(property="id_token", type="array", @OA\Items(type="string")))))
 * )
 *
 * @OA\Post(
 *     path="/api/v1/auth/two-factor-challenge",
 *     summary="Complete two-factor sign-in",
 *     description="Send the challenge_token from /auth/login with either a 6-digit authenticator code or one recovery code (each recovery code works once).",
 *     operationId="authTwoFactorChallenge",
 *     tags={"Auth"},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Complete two-factor sign-in payload",
 *
 *         @OA\JsonContent(
 *             required={"challenge_token"},
 *
 *             @OA\Property(property="challenge_token", type="string", example="eyJpdiI6…"),
 *             @OA\Property(property="code", type="string", example="123456"),
 *             @OA\Property(property="recovery_code", type="string", example="abcd-efgh")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Signed in.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Signed in."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="two_factor", type="boolean", example=false),
 *                 @OA\Property(property="token", type="string", example="12|Xk9…"),
 *                 @OA\Property(property="token_type", type="string", example="Bearer"),
 *                 @OA\Property(property="user", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="The provided two factor authentication code was invalid."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="code", type="array", @OA\Items(type="string", example="The provided two factor authentication code was invalid."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=429,
 *         description="Too many attempts",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Too Many Attempts."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/auth/register/options",
 *     summary="Registration options",
 *     description="Account types and Bar Councils for the sign-up form.",
 *     operationId="authRegisterOptions",
 *     tags={"Auth"},
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="types", type="array", @OA\Items(type="string", example="client")),
 *                 @OA\Property(property="bar_councils", type="array", @OA\Items(type="string", example="Punjab Bar Council"))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Post(
 *     path="/api/v1/auth/register",
 *     summary="Create an account",
 *     description="Same rules as the web sign-up (CreateNewUser). lawyer/firm need cnic, bar_council_id and enrollment_number; firm also firm_name and firm_registration_number. A 6-digit verification code is emailed; verify with /auth/email/verify.",
 *     operationId="authRegister",
 *     tags={"Auth"},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Create an account payload",
 *
 *         @OA\JsonContent(
 *             required={"registration_type", "name", "email", "phone", "password", "password_confirmation", "terms"},
 *
 *             @OA\Property(property="registration_type", type="string", example="client"),
 *             @OA\Property(property="name", type="string", example="Sana Malik"),
 *             @OA\Property(property="email", type="string", example="sana@example.com"),
 *             @OA\Property(property="phone", type="string", example="03001234567"),
 *             @OA\Property(property="password", type="string", example="Secret#2026"),
 *             @OA\Property(property="password_confirmation", type="string", example="Secret#2026"),
 *             @OA\Property(property="terms", type="boolean", example=true),
 *             @OA\Property(property="cnic", type="string", example="35202-1234567-1"),
 *             @OA\Property(property="bar_council_id", type="integer", example=1),
 *             @OA\Property(property="enrollment_number", type="string", example="LHC-12345"),
 *             @OA\Property(property="firm_name", type="string", example="Khan & Associates"),
 *             @OA\Property(property="firm_registration_number", type="string", example="REG-778"),
 *             @OA\Property(property="firm_invite_code", type="string", example="AB12CD"),
 *             @OA\Property(property="referral_code", type="string", example=""),
 *             @OA\Property(property="coupon_code", type="string", example=""),
 *             @OA\Property(property="device_name", type="string", example="iPhone 16"),
 *             @OA\Property(property="google_token", type="string", example="eyJpdiI6…", description="signup_token from /auth/google: registers without a password")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Account created. Enter the code we emailed you.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Account created. Enter the code we emailed you."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="two_factor", type="boolean", example=false),
 *                 @OA\Property(property="token", type="string", example="12|Xk9…"),
 *                 @OA\Property(property="token_type", type="string", example="Bearer"),
 *                 @OA\Property(property="user", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="The email has already been taken."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="email", type="array", @OA\Items(type="string", example="The email has already been taken."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=429,
 *         description="Too many attempts",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Too Many Attempts."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Post(
 *     path="/api/v1/auth/forgot-password",
 *     summary="Send password reset code",
 *     description="Emails a 6-digit reset code valid for 10 minutes.",
 *     operationId="authForgotPassword",
 *     tags={"Auth"},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Send password reset code payload",
 *
 *         @OA\JsonContent(
 *             required={"email"},
 *
 *             @OA\Property(property="email", type="string", example="client@wakeel.test")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Email sent to client@wakeel.test",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Email sent to client@wakeel.test"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="email", type="string", example="client@wakeel.test")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="We can't find a user with that email address."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="email", type="array", @OA\Items(type="string", example="We can't find a user with that email address."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=429,
 *         description="Too many attempts",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Too Many Attempts."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Post(
 *     path="/api/v1/auth/forgot-password/verify-code",
 *     summary="Verify reset code",
 *     description="Exchanges the emailed 6-digit code for a reset_token used by /auth/reset-password. 5 wrong attempts invalidate the code.",
 *     operationId="authVerifyResetCode",
 *     tags={"Auth"},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Verify reset code payload",
 *
 *         @OA\JsonContent(
 *             required={"email", "code"},
 *
 *             @OA\Property(property="email", type="string", example="client@wakeel.test"),
 *             @OA\Property(property="code", type="string", example="483920")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Code verified. Choose a new password.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Code verified. Choose a new password."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="reset_token", type="string", example="9f8e…"),
 *                 @OA\Property(property="email", type="string", example="client@wakeel.test")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="That code is wrong or has expired. Check the latest email or send a new code."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="code", type="array", @OA\Items(type="string", example="That code is wrong or has expired. Check the latest email or send a new code."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=429,
 *         description="Too many attempts",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Too Many Attempts."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Post(
 *     path="/api/v1/auth/reset-password",
 *     summary="Set a new password",
 *     description="Resets the password with the reset_token. All existing mobile tokens are revoked.",
 *     operationId="authResetPassword",
 *     tags={"Auth"},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Set a new password payload",
 *
 *         @OA\JsonContent(
 *             required={"token", "email", "password", "password_confirmation"},
 *
 *             @OA\Property(property="token", type="string", example="9f8e…"),
 *             @OA\Property(property="email", type="string", example="client@wakeel.test"),
 *             @OA\Property(property="password", type="string", example="NewSecret#2026"),
 *             @OA\Property(property="password_confirmation", type="string", example="NewSecret#2026")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Your password has been reset.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Your password has been reset."),
 *             @OA\Property(property="data", type="object", nullable=true)
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="This password reset token is invalid."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="email", type="array", @OA\Items(type="string", example="This password reset token is invalid."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=429,
 *         description="Too many attempts",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Too Many Attempts."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Get(
 *     path="/api/v1/auth/me",
 *     summary="Current user",
 *     description="The signed-in user with organization, role, permissions and unread counters (as the web shares them).",
 *     operationId="authMe",
 *     tags={"Auth"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="OK",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="OK"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="id", type="integer", example=7),
 *                 @OA\Property(property="name", type="string", example="Sana Malik"),
 *                 @OA\Property(property="email", type="string", example="client@wakeel.test"),
 *                 @OA\Property(property="account_type", type="string", example="client"),
 *                 @OA\Property(property="area", type="string", example="client"),
 *                 @OA\Property(property="email_verified", type="boolean", example=true),
 *                 @OA\Property(property="two_factor_enabled", type="boolean", example=false),
 *                 @OA\Property(property="organization", type="object"),
 *                 @OA\Property(property="unread", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Post(
 *     path="/api/v1/auth/email/verify",
 *     summary="Verify email with code",
 *     description="Confirms the email with the 6-digit code; sends the welcome email.",
 *     operationId="authVerifyEmail",
 *     tags={"Auth"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Verify email with code payload",
 *
 *         @OA\JsonContent(
 *             required={"code"},
 *
 *             @OA\Property(property="code", type="string", example="123456")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Your email address is verified.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Your email address is verified."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="id", type="integer", example=7),
 *                 @OA\Property(property="name", type="string", example="Sana Malik"),
 *                 @OA\Property(property="email", type="string", example="client@wakeel.test"),
 *                 @OA\Property(property="account_type", type="string", example="client"),
 *                 @OA\Property(property="area", type="string", example="client"),
 *                 @OA\Property(property="email_verified", type="boolean", example=true),
 *                 @OA\Property(property="two_factor_enabled", type="boolean", example=false),
 *                 @OA\Property(property="organization", type="object"),
 *                 @OA\Property(property="unread", type="object")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="That code is wrong or has expired. Check the latest email or send a new code."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="code", type="array", @OA\Items(type="string", example="That code is wrong or has expired. Check the latest email or send a new code."))
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=429,
 *         description="Too many attempts",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Too Many Attempts."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Post(
 *     path="/api/v1/auth/email/resend",
 *     summary="Resend verification code",
 *     description="Emails a new 6-digit verification code.",
 *     operationId="authResendVerification",
 *     tags={"Auth"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="Email sent to client@wakeel.test",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Email sent to client@wakeel.test"),
 *             @OA\Property(property="data", type="object", nullable=true)
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=429,
 *         description="Too many attempts",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Too Many Attempts."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 *
 * @OA\Post(
 *     path="/api/v1/auth/logout",
 *     summary="Sign out",
 *     description="Revokes this token and removes the device push token.",
 *     operationId="authLogout",
 *     tags={"Auth"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="Signed out.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Signed out."),
 *             @OA\Property(property="data", type="object", nullable=true)
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Unauthenticated."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=500,
 *         description="Internal Server Error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Something went wrong"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00")
 *         )
 *     )
 * )
 */
class AuthControllerDocs {}
