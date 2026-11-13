<?php

namespace App\Support;

/**
 * Every notification email an admin can reword (Admin, Email templates). The key matches
 * PlatformNotification::mailTemplateKey(); placeholders are what that notification fills in
 * (:name and :site are always available). See docs/Features/Email-Templates.md.
 */
class EmailTemplateRegistry
{
    /** @return array<string, array{label: string, group: string, placeholders: list<string>}> */
    public static function all(): array
    {
        $appointment = ['name', 'site', 'lawyer', 'client', 'date', 'status'];

        return [
            'appointment_requested' => ['label' => __('Consultation request (to lawyer)'), 'group' => __('Appointments'), 'placeholders' => $appointment],
            'appointment_booked' => ['label' => __('Request received (to client)'), 'group' => __('Appointments'), 'placeholders' => $appointment],
            'appointment_confirmed' => ['label' => __('Appointment accepted'), 'group' => __('Appointments'), 'placeholders' => $appointment],
            'appointment_declined' => ['label' => __('Appointment declined'), 'group' => __('Appointments'), 'placeholders' => $appointment],
            'appointment_rescheduled' => ['label' => __('Appointment rescheduled'), 'group' => __('Appointments'), 'placeholders' => $appointment],
            'appointment_reschedule_requested' => ['label' => __('New time requested by client'), 'group' => __('Appointments'), 'placeholders' => $appointment],
            'appointment_cancelled' => ['label' => __('Appointment cancelled'), 'group' => __('Appointments'), 'placeholders' => $appointment],
            'appointment_reminder' => ['label' => __('Appointment reminder'), 'group' => __('Appointments'), 'placeholders' => ['name', 'site', 'lawyer', 'client', 'date']],
            'hearing_reminder' => ['label' => __('Hearing reminder'), 'group' => __('Court diary'), 'placeholders' => ['name', 'site', 'case', 'court', 'date', 'time']],
            'hearing_update' => ['label' => __('Hearing scheduled, moved or cancelled'), 'group' => __('Court diary'), 'placeholders' => ['name', 'site']],
            'message' => ['label' => __('New message'), 'group' => __('Messages'), 'placeholders' => ['name', 'site']],
            'payment' => ['label' => __('Payment received'), 'group' => __('Billing'), 'placeholders' => ['name', 'site']],
            'case_update' => ['label' => __('Account and verification updates'), 'group' => __('Account'), 'placeholders' => ['name', 'site']],
            'feedback_received' => ['label' => __('Feedback received'), 'group' => __('Support'), 'placeholders' => ['name', 'site', 'reference', 'subject']],
            'contact_received' => ['label' => __('Contact message received'), 'group' => __('Support'), 'placeholders' => ['name', 'site', 'reference', 'subject']],
            'email_verification_code' => ['label' => __('Email verification code'), 'group' => __('Account'), 'placeholders' => ['name', 'site', 'code', 'minutes']],
            'welcome' => ['label' => __('Welcome after sign up'), 'group' => __('Account'), 'placeholders' => ['name', 'site']],
            'portal_invitation' => ['label' => __('Client portal invitation'), 'group' => __('Account'), 'placeholders' => ['name', 'site', 'firm', 'lawyer']],
            'plan_payment_received' => ['label' => __('Plan payment received'), 'group' => __('Billing'), 'placeholders' => ['name', 'site', 'plan', 'amount']],
            'plan_activated' => ['label' => __('Plan activated'), 'group' => __('Billing'), 'placeholders' => ['name', 'site', 'plan', 'date']],
            'plan_payment_rejected' => ['label' => __('Plan payment not confirmed'), 'group' => __('Billing'), 'placeholders' => ['name', 'site', 'plan', 'reason']],
            'trial_ending' => ['label' => __('Free trial ending'), 'group' => __('Billing'), 'placeholders' => ['name', 'site', 'plan', 'date']],
            'plan_expired' => ['label' => __('Plan expired'), 'group' => __('Billing'), 'placeholders' => ['name', 'site', 'plan']],
            'article_published' => ['label' => __('Article approved'), 'group' => __('Articles and reviews'), 'placeholders' => ['name', 'site', 'title']],
            'article_rejected' => ['label' => __('Article sent back'), 'group' => __('Articles and reviews'), 'placeholders' => ['name', 'site', 'title', 'reason']],
            'review' => ['label' => __('New review on your profile'), 'group' => __('Articles and reviews'), 'placeholders' => ['name', 'site', 'rating', 'client']],
            'password_reset_code' => ['label' => __('Password reset code'), 'group' => __('Account'), 'placeholders' => ['name', 'site', 'code', 'minutes']],
        ];
    }
}
