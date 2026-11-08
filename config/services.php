<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    | Official WhatsApp Business Cloud API (Meta). Leave blank to disable —
    | deliveries are then logged as "skipped" (never faked as sent).
    | See docs/Features/WhatsApp.md.
    */
    'whatsapp' => [
        'token' => env('WHATSAPP_ACCESS_TOKEN'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'app_secret' => env('WHATSAPP_APP_SECRET'),
        'verify_token' => env('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
        'api_version' => env('WHATSAPP_API_VERSION', 'v21.0'),
        'base_url' => env('WHATSAPP_BASE_URL', 'https://graph.facebook.com'),
    ],

    /*
    | AI provider for drafting/research assistance. Disabled when no key.
    | See docs/Modules/AI-Assistant.md.
    */
    'ai' => [
        'provider' => env('AI_PROVIDER', 'anthropic'),
        'anthropic_key' => env('ANTHROPIC_API_KEY'),
        'model' => env('AI_MODEL', 'claude-opus-5-5'),
        'max_tokens' => (int) env('AI_MAX_TOKENS', 2048),
    ],

    /*
    | Online payment gateway (e.g. a Pakistani PSP). Only verified server-side
    | webhooks mark payments paid — never browser redirects.
    */
    'payments' => [
        'gateway' => env('PAYMENT_GATEWAY'),
        'webhook_secret' => env('PAYMENT_WEBHOOK_SECRET'),
    ],

];
