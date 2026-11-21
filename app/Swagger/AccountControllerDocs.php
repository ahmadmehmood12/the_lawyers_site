<?php

namespace App\Swagger;

/**
 * Account: profile, password, two-factor setup, device push token, notifications and notification preferences.
 *
 * @OA\Put(
 *     path="/api/v1/account/profile",
 *     summary="Update profile",
 *     description="Fields left out keep their value. Changing the email sends a new verification code.",
 *     operationId="accountUpdateProfile",
 *     tags={"Account"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Update profile payload",
 *
 *         @OA\JsonContent(
 *             required={},
 *
 *             @OA\Property(property="name", type="string", example="Sana Malik"),
 *             @OA\Property(property="email", type="string", example="sana@example.com"),
 *             @OA\Property(property="phone", type="string", example="03001234567"),
 *             @OA\Property(property="locale", type="string", example="en")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Profile saved.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Profile saved."),
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
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
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
 *             @OA\Property(property="message", type="string", example="The email has already been taken."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="email", type="array", @OA\Items(type="string", example="The email has already been taken."))
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
 * @OA\Put(
 *     path="/api/v1/account/password",
 *     summary="Change password",
 *     description="Same rules as the web (UpdateUserPassword).",
 *     operationId="accountUpdatePassword",
 *     tags={"Account"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Change password payload",
 *
 *         @OA\JsonContent(
 *             required={"current_password", "password", "password_confirmation"},
 *
 *             @OA\Property(property="current_password", type="string", example="password"),
 *             @OA\Property(property="password", type="string", example="NewSecret#2026"),
 *             @OA\Property(property="password_confirmation", type="string", example="NewSecret#2026")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Password updated.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Password updated."),
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
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="The provided password does not match your current password."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="current_password", type="array", @OA\Items(type="string", example="The provided password does not match your current password."))
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
 *     path="/api/v1/account/two-factor",
 *     summary="Two-factor status",
 *     description="Whether two-factor authentication is on or waiting for confirmation.",
 *     operationId="accountTwoFactor",
 *     tags={"Two-factor"},
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
 *                 @OA\Property(property="enabled", type="boolean", example=false),
 *                 @OA\Property(property="pending_confirmation", type="boolean", example=false)
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
 *     path="/api/v1/account/two-factor",
 *     summary="Start two-factor setup",
 *     description="Requires the account password. Returns the secret key, otpauth:// URL and QR SVG for an authenticator app. Confirm with /account/two-factor/confirm.",
 *     operationId="accountEnableTwoFactor",
 *     tags={"Two-factor"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Start two-factor setup payload",
 *
 *         @OA\JsonContent(
 *             required={"password"},
 *
 *             @OA\Property(property="password", type="string", example="password")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Scan the QR code or enter the key in your authenticator app, then confirm with a code.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Scan the QR code or enter the key in your authenticator app, then confirm with a code."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="secret", type="string", example="JBSWY3DPEHPK3PXP"),
 *                 @OA\Property(property="otpauth_url", type="string", example="otpauth://totp/…"),
 *                 @OA\Property(property="qr_svg", type="string", example="<svg …>")
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
 *             @OA\Property(property="message", type="string", example="The password is incorrect."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="password", type="array", @OA\Items(type="string", example="The password is incorrect."))
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
 *     path="/api/v1/account/two-factor/confirm",
 *     summary="Confirm two-factor",
 *     description="Turns two-factor on with a code from the authenticator app and returns recovery codes (show once).",
 *     operationId="accountConfirmTwoFactor",
 *     tags={"Two-factor"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Confirm two-factor payload",
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
 *         description="Two-factor authentication is on.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Two-factor authentication is on."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="recovery_codes", type="array", @OA\Items(type="string", example="abcd-efgh"))
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
 * @OA\Post(
 *     path="/api/v1/account/two-factor/recovery-codes",
 *     summary="Show recovery codes",
 *     description="Requires the account password.",
 *     operationId="accountRecoveryCodes",
 *     tags={"Two-factor"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Show recovery codes payload",
 *
 *         @OA\JsonContent(
 *             required={"password"},
 *
 *             @OA\Property(property="password", type="string", example="password")
 *         )
 *     ),
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
 *                 @OA\Property(property="recovery_codes", type="array", @OA\Items(type="string", example="abcd-efgh"))
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
 *             @OA\Property(property="message", type="string", example="The password is incorrect."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="password", type="array", @OA\Items(type="string", example="The password is incorrect."))
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
 *     path="/api/v1/account/two-factor/recovery-codes/regenerate",
 *     summary="New recovery codes",
 *     description="Replaces all recovery codes. Requires the account password.",
 *     operationId="accountRegenerateRecoveryCodes",
 *     tags={"Two-factor"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="New recovery codes payload",
 *
 *         @OA\JsonContent(
 *             required={"password"},
 *
 *             @OA\Property(property="password", type="string", example="password")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="New recovery codes generated.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="New recovery codes generated."),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="recovery_codes", type="array", @OA\Items(type="string", example="abcd-efgh"))
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
 *             @OA\Property(property="message", type="string", example="The password is incorrect."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="password", type="array", @OA\Items(type="string", example="The password is incorrect."))
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
 * @OA\Delete(
 *     path="/api/v1/account/two-factor",
 *     summary="Turn off two-factor",
 *     description="Requires the account password.",
 *     operationId="accountDisableTwoFactor",
 *     tags={"Two-factor"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Turn off two-factor payload",
 *
 *         @OA\JsonContent(
 *             required={"password"},
 *
 *             @OA\Property(property="password", type="string", example="password")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Two-factor authentication is off.",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Two-factor authentication is off."),
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
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="The password is incorrect."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="password", type="array", @OA\Items(type="string", example="The password is incorrect."))
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
 *     path="/api/v1/account/device-token",
 *     summary="Register device for push",
 *     description="Saves the device push token (raw FCM token on Android or ExponentPushToken[...] from Expo). Response is {registered:true} (same endpoint logic as the web).",
 *     operationId="accountDeviceTokenStore",
 *     tags={"Push notifications"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Register device for push payload",
 *
 *         @OA\JsonContent(
 *             required={"token"},
 *
 *             @OA\Property(property="token", type="string", example="ExponentPushToken[xxxxxxxx]"),
 *             @OA\Property(property="platform", type="string", example="android")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Registered",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Registered"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="registered", type="boolean", example=true)
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
 *             @OA\Property(property="message", type="string", example="The token field is required."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="token", type="array", @OA\Items(type="string", example="The token field is required."))
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
 * @OA\Delete(
 *     path="/api/v1/account/device-token",
 *     summary="Unregister device",
 *     description="Stops push to this account's device.",
 *     operationId="accountDeviceTokenDestroy",
 *     tags={"Push notifications"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="Unregistered",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Success"),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="message", type="string", example="Unregistered"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="registered", type="boolean", example=false)
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
 * @OA\Get(
 *     path="/api/v1/notifications",
 *     summary="Notifications",
 *     description="In-app notifications, newest first, 20 per page; meta.unread is the unread count.",
 *     operationId="notificationsIndex",
 *     tags={"Notifications"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="page", in="query", required=false, description="Page number", @OA\Schema(type="integer", example=1)),
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
 *             @OA\Property(property="data", type="array", @OA\Items(type="object",
 *                 @OA\Property(property="id", type="string", example="9b1c…"),
 *                 @OA\Property(property="data", type="object"),
 *                 @OA\Property(property="read_at", type="string", example=""),
 *                 @OA\Property(property="created_at", type="string", example="2026-11-22T10:00:00+05:00")
 *             )),
 *             @OA\Property(property="meta", type="object", @OA\Property(property="current_page", type="integer", example=1), @OA\Property(property="last_page", type="integer", example=5), @OA\Property(property="per_page", type="integer", example=12), @OA\Property(property="total", type="integer", example=58))
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
 *         response=403,
 *         description="Forbidden (wrong account type, permission or unverified email)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Forbidden"),
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
 *     path="/api/v1/notifications/{id}/read",
 *     summary="Mark one as read",
 *     description="",
 *     operationId="notificationsRead",
 *     tags={"Notifications"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="id", in="path", required=true, description="Notification id", @OA\Schema(type="string", example="9b1c…")),
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
 *                 @OA\Property(property="unread", type="integer", example=4)
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
 *         response=404,
 *         description="Not found (or belongs to another account / organization)",
 *
 *         @OA\JsonContent(
 *             type="object",
 *
 *             @OA\Property(property="status", type="string", example="Failed"),
 *             @OA\Property(property="message", type="string", example="Not found."),
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
 *     path="/api/v1/notifications/read-all",
 *     summary="Mark all as read",
 *     description="",
 *     operationId="notificationsReadAll",
 *     tags={"Notifications"},
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
 *                 @OA\Property(property="unread", type="integer", example=0)
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
 * @OA\Get(
 *     path="/api/v1/notifications/preferences",
 *     summary="Notification preferences",
 *     description="Per-event channel switches (in_app, email, whatsapp, push). Missing rows use defaults.",
 *     operationId="notificationsPreferences",
 *     tags={"Notifications"},
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
 *                 @OA\Property(property="events", type="array", @OA\Items(type="string", example="appointment")),
 *                 @OA\Property(property="channels", type="array", @OA\Items(type="string", example="push")),
 *                 @OA\Property(property="defaults", type="object"),
 *                 @OA\Property(property="preferences", type="array", @OA\Items(type="string", example="")),
 *                 @OA\Property(property="whatsapp_consent", type="boolean", example=false)
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
 * @OA\Put(
 *     path="/api/v1/notifications/preferences",
 *     summary="Save notification preferences",
 *     description="WhatsApp switches only stick after the account-level WhatsApp opt-in.",
 *     operationId="notificationsUpdatePreferences",
 *     tags={"Notifications"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Save notification preferences payload",
 *
 *         @OA\JsonContent(
 *             required={"preferences"},
 *
 *             @OA\Property(property="preferences", type="array", @OA\Items(type="string", example="{""event"":""appointment"",""channel"":""push"",""enabled"":true}"))
 *         )
 *     ),
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
 *                 @OA\Property(property="preferences", type="array", @OA\Items(type="string", example=""))
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
 *             @OA\Property(property="message", type="string", example="The selected preferences.0.event is invalid."),
 *             @OA\Property(property="timestamp", type="string", example="2026-11-22 10:00:00"),
 *             @OA\Property(property="errors", type="object",
 *                 @OA\Property(property="preferences.0.event", type="array", @OA\Items(type="string", example="The selected preferences.0.event is invalid."))
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
 */
class AccountControllerDocs {}
