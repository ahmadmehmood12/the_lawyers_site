<?php

namespace Database\Seeders;

use App\Models\Faq;
use Illuminate\Database\Seeder;

/** Starter FAQs; edit them in Admin, FAQs. Safe to re-run (matched on the question). */
class FaqSeeder extends Seeder
{
    /** Urdu question and answer for each English question. */
    private const URDU = [
        'What does verified mean?' => ['تصدیق شدہ کا کیا مطلب ہے؟', 'ہماری ٹیم نے ان کی بار انرولمنٹ چیک کی ہے۔ یہ درجہ بندی نہیں ہے۔'],
        'Do clients get WhatsApp messages unasked?' => ['کیا کلائنٹس کو بغیر اجازت واٹس ایپ پیغامات آتے ہیں؟', 'نہیں۔ یاد دہانیاں صرف انہی کلائنٹس کو جاتی ہیں جنہوں نے اجازت دی ہو۔'],
        'Who can read my case notes?' => ['میرے مقدمے کے نوٹس کون پڑھ سکتا ہے؟', 'صرف آپ کا چیمبر۔ کلائنٹس اندرونی نوٹس کبھی نہیں دیکھتے۔'],
        'Does it file anything in court?' => ['کیا یہ عدالت میں کچھ دائر کرتا ہے؟', 'کبھی نہیں۔ ہر مسودہ آپ خود چیک کرتے، دستخط کرتے اور دائر کرتے ہیں۔'],
        'Can my clerk and juniors use the same account?' => ['کیا میرا منشی اور جونیئرز ایک ہی اکاؤنٹ استعمال کر سکتے ہیں؟', 'جی ہاں۔ انہیں اپنے چیمبر یا فرم میں مدعو کریں اور ہر ایک کو کردار دیں، جیسے منشی یا ایسوسی ایٹ ایڈووکیٹ۔ ہر شخص اپنے ای میل سے سائن ان کرتا ہے۔'],
        'Can I add cases from before I joined?' => ['کیا میں شمولیت سے پہلے کے مقدمات شامل کر سکتا ہوں؟', 'جی ہاں۔ مقدمہ ایف آئی آر، فریقین، عدالت اور گزشتہ سماعتوں کے ساتھ شامل کریں، ڈائری اگلی تاریخ سے جاری رہے گی۔'],
        'How do I book a consultation?' => ['میں مشاورت کیسے بک کروں؟', 'وکیل کا پروفائل کھولیں اور اپائنٹمنٹ بک کریں منتخب کریں۔ وکیل قبول، انکار یا دوسرا وقت تجویز کرتا ہے، اور آپ کو ای میل اور اجازت ہو تو واٹس ایپ پر اطلاع ملتی ہے۔'],
        'Is the advice on articles legal advice?' => ['کیا مضامین میں دی گئی بات قانونی مشورہ ہے؟', 'نہیں۔ مضامین عمومی معلومات ہیں۔ اپنے معاملے کے بارے میں وکیل سے بات کریں۔'],
        'Can I see my case documents?' => ['کیا میں اپنے مقدمے کی دستاویزات دیکھ سکتا ہوں؟', 'صرف وہ دستاویزات جو آپ کا وکیل آپ سے شیئر کرنے کا فیصلہ کرے، آپ کے پورٹل میں دکھائی دیتی ہیں۔'],
        'Is there a free trial?' => ['کیا مفت ٹرائل ہے؟', 'جی ہاں۔ وکلاء اور فرمز کا ہر پلان مفت ٹرائل سے شروع ہوتا ہے۔ آغاز کے لیے کارڈ کی ضرورت نہیں۔'],
        'How do I pay for a plan?' => ['میں پلان کی ادائیگی کیسے کروں؟', 'پلان منتخب کریں اور چیک آؤٹ پر دیے گئے طریقوں، جیسے بینک ٹرانسفر، سے ادائیگی کریں۔ تصدیق ہوتے ہی آپ کا پلان فعال ہو جاتا ہے۔'],
        'Where is my data kept and can I delete it?' => ['میرا ڈیٹا کہاں رکھا جاتا ہے اور کیا میں اسے حذف کر سکتا ہوں؟', 'آپ کا ریکارڈ آپ کے چیمبر کی ملکیت ہے۔ آپ اکاؤنٹ سیٹنگز سے اکاؤنٹ حذف کرنے کی درخواست دے سکتے ہیں؛ ہم ہر درخواست کا جائزہ لیتے ہیں۔'],
    ];

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
                'question_ur' => self::URDU[$question][0] ?? null, 'answer_ur' => self::URDU[$question][1] ?? null,
            ]);
        }
    }
}
