# Database Mapping

The mobile app never accesses MySQL directly. These Laravel tables/models back
the features shown on mobile; field names come from `database/migrations` and
`app/Models`.

| Mobile feature | Primary tables | Key fields |
|---|---|---|
| Lawyer discovery/profile | `users`, `lawyer_profiles`, `lawyer_specialization`, `lawyer_languages`, `lawyer_educations`, `lawyer_experiences`, `lawyer_credentials`, `reviews`, `favourite_lawyers` | `account_type`, `slug`, `headline`, `photo_path`, `consultation_fee_min/max`, `offers_online`, `verification_status`, `rating_average/count` |
| Firm discovery | `organizations`, `organization_members`, `cities` | `type`, `slug`, `logo_path`, `is_public`, `founded_year` |
| Cases/timeline | `legal_cases`, `case_client`, `case_lawyer`, `case_parties`, `case_events`, `related_cases` | `reference`, `case_number`, `status`, `stage`, `priority`, `next_hearing_at`, `share_with_client` |
| Hearings/court diary | `hearings`, `diary_entries`, `courts`, `judges`, `court_holidays` | `hearing_date/time`, `order_passed`, `adjournment_reason`, `visible_to_client`, `entry_date` |
| Calendar | `calendar_events`, `calendar_event_changes`, `availability_slots`, `unavailable_dates` | `type`, `starts_at`, `ends_at`, `recurrence`, `visibility` |
| Clients | `clients`, `users`, `cities` | `type`, `cnic`, `ntn`, `whatsapp`, `preferred_locale`, `whatsapp_consent_at` |
| Appointments | `appointments`, `availability_slots`, `unavailable_dates` | `starts_at`, `mode`, `status`, `fee`, `meeting_link`, `rescheduled_from_id` |
| Documents | `documents`, `document_versions`, `document_shares`, `document_access_logs` | `category`, `is_confidential`, `current_version_id`, `disk`, `path` |
| Fees/payments | `invoices`, `invoice_items`, `payments`, `refunds`, `case_expenses`, `time_entries` | `total`, `amount_paid`, `receipt_number`, `status`, `paid_on` |
| AI assistant | `ai_requests` | `feature`, `provider`, `model`, `status`, `redacted` |
| Judgments | `reported_judgments`, `judgment_pages`, `judgment_keywords` | `citation`, `decision_date`, `stored_pdf_path`, `summary`, `extraction_status` |
| Notifications | `notifications`, `notification_preferences`, `notification_deliveries`, `reminder_settings` | `event`, `channel`, `enabled`, `status`, `dedupe_key` |
| Team/permissions | `organizations`, `organization_members`, `organization_invitations`, `roles`, `permissions`, `model_has_roles` | `role`, `status`, `current_organization_id` |
| Settings/security | `users`, `settings`, `sessions` | `theme`, `locale`, `fcm_token`, `status`, `two_factor_secret` |
| Mobile app config | `settings` | `mobile_app_*`, `app_force_update`, `app_maintenance`, FCM flags |

Important: sensitive fields such as CNIC, NTN, private notes, internal case
notes, and verification evidence must stay backend-gated. The mobile client
must display only fields returned by an authorized endpoint.
