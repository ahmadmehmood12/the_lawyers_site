<?php

namespace Database\Seeders;

use App\Models\Faq;
use Illuminate\Database\Seeder;

/** Starter FAQs; edit them in Admin, FAQs. Safe to re-run (matched on the question). */
class FaqSeeder extends Seeder
{
    public function run(): void
    {
        $faqs = [
            ['Advocates', 'What does verified mean?', 'Our team checked their bar enrollment. It is not a rating.', true],
            ['Privacy', 'Do clients get WhatsApp messages unasked?', 'No. Reminders go only to clients who consented.', true],
            ['Privacy', 'Who can read my case notes?', 'Your chambers only. Clients never see internal notes.', true],
            ['Advocates', 'Does it file anything in court?', 'Never. You check, sign and file every draft yourself.', true],
            ['Advocates', 'Can my clerk and juniors use the same account?', 'Yes. Invite them to your chambers or firm and give each a role, such as clerk or associate advocate. Each person signs in with their own email.', false],
            ['Advocates', 'Can I add cases from before I joined?', 'Yes. Add the case with its FIR, parties, court and past hearings, and the diary picks up from the next date.', false],
            ['Clients', 'How do I book a consultation?', 'Open an advocate’s profile and choose Book appointment. The advocate accepts, declines or proposes another time, and you are told by email and WhatsApp if you opted in.', false],
            ['Clients', 'Is the advice on articles legal advice?', 'No. Articles are general information. Speak to an advocate about your own matter.', false],
            ['Clients', 'Can I see my case documents?', 'Only the documents your advocate chooses to share with you appear in your portal.', false],
            ['Billing', 'Is there a free trial?', 'Yes. Every plan for advocates and firms starts with a free trial. No card is needed to start.', false],
            ['Billing', 'How do I pay for a plan?', 'Choose a plan and pay by the methods listed at checkout, such as bank transfer. Your plan is switched on once the payment is confirmed.', false],
            ['Privacy', 'Where is my data kept and can I delete it?', 'Your records belong to your chambers. You can ask for your account to be deleted from Account settings; we review each request.', false],
        ];

        foreach ($faqs as $i => [$category, $question, $answer, $home]) {
            Faq::query()->updateOrCreate(['question' => $question], [
                'category' => $category, 'answer' => $answer, 'show_on_home' => $home, 'is_active' => true, 'sort_order' => $i * 10,
            ]);
        }
    }
}
