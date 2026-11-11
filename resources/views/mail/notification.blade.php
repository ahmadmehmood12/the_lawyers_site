{{--
    Branded notification email (docs/Features/Email-Templates.md). Table layout with inline
    styles for email clients. Data: site, logo, heading, greeting, intro, details (label => value),
    action_label, action_url, outro, notice, rtl.
--}}
<!DOCTYPE html>
<html lang="{{ $rtl ? 'ur' : 'en' }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>{{ $heading }}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1e9;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0f1e36;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1e9;padding:24px 12px;">
    <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e1e8f2;border-radius:12px;overflow:hidden;">
            <tr>
                <td style="background:#0f1e36;padding:20px 28px;">
                    @if ($logo)
                        <img src="{{ $logo }}" alt="{{ $site }}" height="36" style="display:block;height:36px;width:auto;border:0;">
                    @else
                        <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">{{ $site }}</span>
                    @endif
                </td>
            </tr>
            <tr><td style="height:4px;background:#b8892b;line-height:4px;font-size:0;">&nbsp;</td></tr>
            <tr>
                <td style="padding:32px 28px 8px;text-align:{{ $rtl ? 'right' : 'left' }};">
                    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;font-weight:700;color:#0f1e36;">{{ $heading }}</h1>
                    @if ($greeting)<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">{{ $greeting }}</p>@endif
                    @foreach ((array) $intro as $line)
                        <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#283c5c;">{{ $line }}</p>
                    @endforeach
                </td>
            </tr>
            @if (! empty($details))
            <tr>
                <td style="padding:8px 28px 8px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e1e8f2;border-radius:8px;background:#faf8f3;">
                        @foreach ($details as $label => $value)
                            @if (filled($value))
                            <tr>
                                <td style="padding:10px 14px;font-size:13px;color:#45628d;width:38%;vertical-align:top;border-bottom:1px solid #eef2f7;text-align:{{ $rtl ? 'right' : 'left' }};">{{ $label }}</td>
                                <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#0f1e36;vertical-align:top;border-bottom:1px solid #eef2f7;text-align:{{ $rtl ? 'right' : 'left' }};">{{ $value }}</td>
                            </tr>
                            @endif
                        @endforeach
                    </table>
                </td>
            </tr>
            @endif
            @if ($action_url)
            <tr>
                <td style="padding:20px 28px 8px;text-align:{{ $rtl ? 'right' : 'left' }};">
                    <a href="{{ $action_url }}" style="display:inline-block;background:#0f1e36;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:8px;">{{ $action_label }}</a>
                </td>
            </tr>
            @endif
            @if ($notice)
            <tr>
                <td style="padding:16px 28px 0;">
                    <p style="margin:0;padding:12px 14px;background:#fbf7ec;border:1px solid #f4eacb;border-radius:8px;font-size:13px;line-height:1.5;color:#774f1f;">{{ $notice }}</p>
                </td>
            </tr>
            @endif
            <tr>
                <td style="padding:20px 28px 28px;text-align:{{ $rtl ? 'right' : 'left' }};">
                    @foreach ((array) $outro as $line)
                        <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#283c5c;">{{ $line }}</p>
                    @endforeach
                    <p style="margin:12px 0 0;font-size:14px;color:#283c5c;">{{ __('Regards,') }}<br><strong>{{ $site }}</strong></p>
                </td>
            </tr>
            <tr>
                <td style="background:#f2f5fa;padding:16px 28px;font-size:12px;line-height:1.5;color:#45628d;text-align:{{ $rtl ? 'right' : 'left' }};">
                    {{ __('You receive this because of your account or case on :site. Manage email and WhatsApp alerts in your notification settings.', ['site' => $site]) }}<br>
                    {{ __('Information in this message is not legal advice.') }}
                </td>
            </tr>
        </table>
    </td></tr>
</table>
</body>
</html>
