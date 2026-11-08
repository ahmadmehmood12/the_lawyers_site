<?php

namespace Database\Seeders;

use App\Enums\PlanFeature as F;
use App\Models\Page;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\WhatsAppTemplate;
use Illuminate\Database\Seeder;

/**
 * Plans, WhatsApp template registry, CMS pages and default settings.
 * Plan prices are placeholders for the business to set in Admin → Plans.
 * WhatsApp templates are seeded as "pending": an admin marks each approved
 * only after Meta approves it. Legal pages must be reviewed by counsel.
 */
class PlatformContentSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            ['free', 'Free', 'مفت', 'lawyer', 0, 0, 0, 'For getting started with your court diary.',
                [F::MaxActiveCases->value => 15, F::MaxClients->value => 30, F::MaxTeamMembers->value => 1, F::StorageMb->value => 500, F::WhatsAppReminders->value => 0, F::AiAssistant->value => 0, F::DraftingTemplates->value => null, F::ClientPortal->value => null, F::Analytics->value => 0]],
            ['basic', 'Basic', 'بنیادی', 'lawyer', 1500, 15000, 14, 'For individual advocates with a growing practice.',
                [F::MaxActiveCases->value => 75, F::MaxClients->value => 200, F::MaxTeamMembers->value => 2, F::StorageMb->value => 5000, F::WhatsAppReminders->value => 300, F::AiAssistant->value => 0, F::DraftingTemplates->value => null, F::ClientPortal->value => null, F::Analytics->value => null]],
            ['professional', 'Professional', 'پروفیشنل', 'lawyer', 3500, 35000, 14, 'Unlimited cases, WhatsApp reminders and AI drafting help.',
                [F::MaxActiveCases->value => null, F::MaxClients->value => null, F::MaxTeamMembers->value => 4, F::StorageMb->value => 20000, F::WhatsAppReminders->value => 1500, F::AiAssistant->value => 150, F::DraftingTemplates->value => null, F::ClientPortal->value => null, F::Analytics->value => null]],
            ['premium', 'Premium', 'پریمیم', 'lawyer', 6000, 60000, 14, 'For senior advocates with chambers staff.',
                [F::MaxActiveCases->value => null, F::MaxClients->value => null, F::MaxTeamMembers->value => 8, F::StorageMb->value => 50000, F::WhatsAppReminders->value => null, F::AiAssistant->value => 500, F::DraftingTemplates->value => null, F::ClientPortal->value => null, F::Analytics->value => null]],
            ['law-firm', 'Law Firm', 'لاء فرم', 'firm', 15000, 150000, 14, 'Multi-lawyer firms with shared diary and firm analytics.',
                [F::MaxActiveCases->value => null, F::MaxClients->value => null, F::MaxTeamMembers->value => 40, F::StorageMb->value => 200000, F::WhatsAppReminders->value => null, F::AiAssistant->value => 2000, F::DraftingTemplates->value => null, F::ClientPortal->value => null, F::Analytics->value => null]],
        ];

        foreach ($plans as $i => [$slug, $name, $ur, $audience, $monthly, $yearly, $trial, $description, $features]) {
            $plan = Plan::query()->updateOrCreate(['slug' => $slug], [
                'name' => $name, 'name_ur' => $ur, 'audience' => $audience, 'price_monthly' => $monthly, 'price_yearly' => $yearly,
                'trial_days' => $trial, 'description' => $description, 'is_active' => true, 'sort_order' => $i,
            ]);
            foreach ($features as $feature => $limit) {
                $plan->features()->updateOrCreate(['feature' => $feature], ['limit_value' => $limit]);
            }
        }

        $templates = [
            ['hearing_reminder', 'hearing_reminder_v1', 'en', 'Dear {{1}}, reminder: your case "{{2}}" is fixed for hearing on {{3}} at {{4}} before {{5}}.', 5],
            ['hearing_reminder', 'hearing_reminder_ur_v1', 'ur', 'محترم {{1}}، یاد دہانی: آپ کا مقدمہ "{{2}}" مورخہ {{3}} وقت {{4}} کو {{5}} میں سماعت کے لیے مقرر ہے۔', 5],
            ['hearing_rescheduled', 'hearing_rescheduled_v1', 'en', 'Dear {{1}}, the hearing in "{{2}}" has been rescheduled to {{3}}.', 3],
            ['hearing_cancelled', 'hearing_cancelled_v1', 'en', 'Dear {{1}}, the hearing in "{{2}}" fixed for {{3}} has been cancelled. Your lawyer will share the next date.', 3],
            ['hearing_scheduled', 'hearing_scheduled_v1', 'en', 'Dear {{1}}, a hearing in "{{2}}" has been fixed for {{3}}.', 3],
            ['appointment_reminder', 'appointment_reminder_v1', 'en', 'Dear {{1}}, reminder of your consultation with {{2}} on {{3}}.', 3],
            ['payment_received', 'payment_received_v1', 'en', 'Dear {{1}}, we have received your payment of {{2}}. Receipt no. {{3}}.', 3],
            ['feedback_received', 'feedback_received_v1', 'en', 'Dear {{1}}, {{2}} has received your feedback (ref {{3}}). We will try to resolve it on an urgent basis.', 3],
            ['feedback_received', 'feedback_received_ur_v1', 'ur', 'محترم {{1}}، {{2}} کو آپ کی رائے موصول ہو گئی ہے (حوالہ {{3}})۔ ہم اسے جلد از جلد حل کرنے کی کوشش کریں گے۔', 3],
            ['contact_received', 'contact_received_v1', 'en', 'Dear {{1}}, thank you for contacting {{2}}. Your reference is {{3}}. We will reply soon.', 3],
            ['contact_received', 'contact_received_ur_v1', 'ur', 'محترم {{1}}، {{2}} سے رابطہ کرنے کا شکریہ۔ آپ کا حوالہ نمبر {{3}} ہے۔ ہم جلد جواب دیں گے۔', 3],
        ];
        foreach ($templates as [$key, $name, $language, $body, $vars]) {
            WhatsAppTemplate::query()->firstOrCreate(['key' => $key, 'language' => $language], ['name' => $name, 'category' => 'utility', 'body_preview' => $body, 'variable_count' => $vars, 'status' => 'pending']);
        }

        $notice = '<p><em>This page is a starting draft and must be reviewed by the platform’s legal counsel before launch.</em></p>';
        $pages = [
            'about' => ['About Wakeel Diary', 'ہمارے بارے میں', '<p>Wakeel Diary is a practice-management platform built for advocates and law firms in Pakistan: a court diary that works on the phone in the court corridor, complete case files, client communication, documents, drafting and billing — with Urdu and English throughout.</p><p>For clients, it is a directory of advocates where verified credentials are clearly distinguished from self-reported information.</p>'],
            'faqs' => ['Frequently Asked Questions', 'عمومی سوالات', '<h2>Is a “Verified” badge a guarantee?</h2><p>The badge means our verification team reviewed the advocate’s submitted Bar enrollment evidence. It is not an endorsement of competence or a guarantee of any outcome.</p><h2>Who can see my case?</h2><p>Only members of your lawyer’s chambers who are permitted to, and you — for the information your lawyer chooses to share. Private notes are never shown to clients.</p><h2>Are WhatsApp reminders automatic?</h2><p>Reminders are sent through the official WhatsApp Business API only to people who have agreed to receive them.</p>'],
            'terms' => ['Terms of Service', 'شرائط و ضوابط', $notice.'<p>By using Wakeel Diary you agree to use it lawfully and to keep your credentials confidential. Information on the public site is not legal advice. Lawyers remain solely responsible for their professional work, filings and advice. Wakeel Diary never files documents with any court.</p>'],
            'privacy' => ['Privacy Policy', 'رازداری کی پالیسی', $notice.'<p>We store case and client information encrypted where sensitive and accessible only to authorized members of the relevant chambers. We do not sell personal data. WhatsApp and email messages are sent only according to your preferences and consent. You may request export or deletion of your account data; legal and financial records may be retained where the law requires.</p>'],
            'legal-resources' => ['Legal Resources', 'قانونی وسائل', '<p>Official sources for Pakistani law:</p><ul><li><a href="https://pakistancode.gov.pk">Pakistan Code</a> — federal statutes</li><li><a href="https://www.supremecourt.gov.pk">Supreme Court of Pakistan</a></li><li><a href="https://pbc.org.pk">Pakistan Bar Council</a></li></ul><p>Always verify the current text of a law from an official source.</p>'],
        ];
        foreach ($pages as $slug => [$title, $ur, $body]) {
            Page::query()->firstOrCreate(['slug' => $slug], ['title' => $title, 'title_ur' => $ur, 'body' => $body, 'is_published' => true]);
        }

        $settings = [
            'default_plan' => 'free',
            'support_email' => 'support@example.com',
            'ai_enabled' => '0',
            'ai_redact_personal_data' => '1',
            'reviews_require_moderation' => '1',
            'site_theme' => 'navy-gold',
            'whatsapp_enabled' => '1',
            'site_name' => 'WakeelDiary',
            'site_tagline' => 'Court diary, case files and verified lawyers for Pakistan.',
            'whatsapp_display_name' => 'WakeelDiary',
            'whatsapp_api_version' => 'v21.0',
        ];

        foreach ($settings as $key => $value) {
            if (Setting::query()->where('key', $key)->doesntExist()) {
                Setting::put($key, $value);
            }
        }
    }
}
