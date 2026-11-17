<?php

namespace Database\Seeders;

use App\Models\Faq;
use Illuminate\Database\Seeder;

/**
 * Production FAQs for /faqs and the homepage (show_on_home), in English and Urdu. Every answer
 * describes how the site actually works; edit them in Admin, FAQs. Safe to re-run: matched on the
 * English question, and the early placeholder questions are removed.
 */
class FaqSeeder extends Seeder
{
    /** Placeholder questions from the first version of this seeder. */
    private const RETIRED = [
        'What does verified mean?', 'Do clients get WhatsApp messages unasked?', 'Who can read my case notes?', 'Does it file anything in court?',
        'Can my clerk and juniors use the same account?', 'Can I add cases from before I joined?', 'How do I book a consultation?',
        'Is the advice on articles legal advice?', 'Can I see my case documents?', 'Is there a free trial?', 'How do I pay for a plan?',
        'Where is my data kept and can I delete it?',
    ];

    public function run(): void
    {
        Faq::query()->whereIn('question', self::RETIRED)->delete();

        foreach ($this->faqs() as $i => [$category, $home, $question, $answer, $questionUr, $answerUr]) {
            Faq::query()->updateOrCreate(['question' => $question], [
                'category' => $category, 'answer' => $answer, 'question_ur' => $questionUr, 'answer_ur' => $answerUr,
                'show_on_home' => $home, 'is_active' => true, 'sort_order' => $i * 10,
            ]);
        }
    }

    /** @return list<array{0: string, 1: bool, 2: string, 3: string, 4: string, 5: string}> */
    private function faqs(): array
    {
        return [
            // Getting started
            ['Getting started', true,
                'What is Da Barrister?',
                'Da Barrister is a practice management platform for advocates and law firms in Pakistan, with a public directory where clients can find verified advocates. Advocates keep their court diary, case files, clients, documents, drafts and invoices in one place, and clients can follow their case through a secure portal.',
                'دا بیرسٹر کیا ہے؟',
                'دا بیرسٹر پاکستان کے وکلاء اور لاء فرمز کے لیے پریکٹس مینجمنٹ پلیٹ فارم ہے، جس میں ایک عوامی ڈائریکٹری بھی ہے جہاں کلائنٹس تصدیق شدہ وکلاء تلاش کر سکتے ہیں۔ وکلاء اپنی عدالتی ڈائری، مقدمات کی فائلیں، کلائنٹس، دستاویزات، مسودے اور انوائسز ایک جگہ رکھتے ہیں، اور کلائنٹس محفوظ پورٹل کے ذریعے اپنے مقدمے سے باخبر رہتے ہیں۔'],
            ['Getting started', false,
                'Who can sign up?',
                'Advocates enrolled with a Bar Council, law firms, and members of the public looking for a lawyer. Advocates and firms give their CNIC, Bar Council and enrollment number when they register. Firm staff such as clerks, receptionists and accountants join through an invitation from the firm.',
                'کون اکاؤنٹ بنا سکتا ہے؟',
                'بار کونسل میں رجسٹرڈ وکلاء، لاء فرمز، اور وکیل تلاش کرنے والے عام افراد۔ وکلاء اور فرمز رجسٹریشن کے وقت اپنا شناختی کارڈ نمبر، بار کونسل اور انرولمنٹ نمبر دیتے ہیں۔ فرم کا عملہ جیسے منشی، ریسپشنسٹ اور اکاؤنٹنٹ فرم کی دعوت سے شامل ہوتے ہیں۔'],
            ['Getting started', false,
                'Can I use it in Urdu?',
                'Yes. Switch the language from the top of any page. Menus, emails and the client portal follow your choice, and drafts and PDFs can be written in Urdu.',
                'کیا میں اسے اردو میں استعمال کر سکتا ہوں؟',
                'جی ہاں۔ کسی بھی صفحے کے اوپر سے زبان تبدیل کریں۔ مینو، ای میلز اور کلائنٹ پورٹل آپ کی منتخب زبان میں ہوں گے، اور مسودے اور پی ڈی ایف اردو میں بھی بنائے جا سکتے ہیں۔'],
            ['Getting started', false,
                'Does it work on my phone?',
                'Yes. Da Barrister runs in the browser and is designed for phones, tablets and computers. There is nothing to install; sign in from any device.',
                'کیا یہ موبائل فون پر چلتا ہے؟',
                'جی ہاں۔ دا بیرسٹر براؤزر میں چلتا ہے اور فون، ٹیبلٹ اور کمپیوٹر سب کے لیے بنایا گیا ہے۔ کچھ انسٹال کرنے کی ضرورت نہیں؛ کسی بھی ڈیوائس سے سائن اِن کریں۔'],
            ['Getting started', false,
                'Can I sign in with Google?',
                'Yes, when it is shown on the sign in page. If your Google email already has an account you are signed straight in; otherwise you finish sign up with your remaining details. You can also sign in with your email and password, and turn on two factor authentication in Account settings.',
                'کیا میں گوگل کے ذریعے سائن اِن کر سکتا ہوں؟',
                'جی ہاں، جب یہ آپشن سائن اِن صفحے پر دکھائی دے۔ اگر آپ کے گوگل ای میل کا اکاؤنٹ پہلے سے موجود ہے تو آپ فوراً داخل ہو جائیں گے؛ ورنہ باقی تفصیلات دے کر اکاؤنٹ مکمل کریں۔ آپ ای میل اور پاس ورڈ سے بھی سائن اِن کر سکتے ہیں اور اکاؤنٹ سیٹنگز میں ٹو فیکٹر تصدیق آن کر سکتے ہیں۔'],

            // Advocates and firms
            ['Advocates and firms', true,
                'What does the “Verified” badge mean?',
                'Our verification team has checked the advocate’s enrollment details and documents against the Bar Council record. It confirms identity and enrollment only; it is not a rating or a recommendation of their work.',
                '“تصدیق شدہ” بیج کا کیا مطلب ہے؟',
                'ہماری تصدیقی ٹیم نے وکیل کی انرولمنٹ کی تفصیلات اور دستاویزات کو بار کونسل کے ریکارڈ سے چیک کیا ہے۔ یہ صرف شناخت اور انرولمنٹ کی تصدیق ہے؛ یہ کوئی درجہ بندی یا ان کے کام کی سفارش نہیں۔'],
            ['Advocates and firms', false,
                'How do I get verified?',
                'Complete your profile, then open Verification and submit your CNIC, Bar Council, enrollment number and a copy of your Bar license or enrollment certificate. Requests are reviewed in the order received; you are told the decision by email, and if anything is missing we ask for it.',
                'میری تصدیق کیسے ہوگی؟',
                'اپنا پروفائل مکمل کریں، پھر ویریفکیشن کھول کر اپنا شناختی کارڈ نمبر، بار کونسل، انرولمنٹ نمبر اور بار لائسنس یا انرولمنٹ سرٹیفکیٹ کی کاپی جمع کرائیں۔ درخواستیں موصول ہونے کی ترتیب سے دیکھی جاتی ہیں؛ فیصلہ ای میل پر بتایا جاتا ہے، اور اگر کچھ کم ہو تو ہم آپ سے مانگ لیتے ہیں۔'],
            ['Advocates and firms', true,
                'How does the court diary work?',
                'Add a hearing to a case, and after the hearing record what happened: the order, whether it was adjourned and the next date. The next hearing is created for you, the case history stays in order, and the date appears in your diary, calendar and reminders.',
                'عدالتی ڈائری کیسے کام کرتی ہے؟',
                'مقدمے میں سماعت شامل کریں، اور سماعت کے بعد درج کریں کہ کیا ہوا: حکم، ملتوی ہوا یا نہیں، اور اگلی تاریخ۔ اگلی سماعت خود بن جاتی ہے، مقدمے کی تاریخ ترتیب سے رہتی ہے، اور تاریخ آپ کی ڈائری، کیلنڈر اور یاد دہانیوں میں آ جاتی ہے۔'],
            ['Advocates and firms', false,
                'Can I add cases that started before I joined?',
                'Yes. Add the case with its parties, court, FIR details and earlier hearings. The diary continues from the next date.',
                'کیا میں شمولیت سے پہلے کے مقدمات شامل کر سکتا ہوں؟',
                'جی ہاں۔ مقدمہ اس کے فریقین، عدالت، ایف آئی آر کی تفصیلات اور گزشتہ سماعتوں کے ساتھ شامل کریں۔ ڈائری اگلی تاریخ سے جاری رہے گی۔'],
            ['Advocates and firms', false,
                'Can my clerk and juniors work in the same account?',
                'Yes. Invite them by email from Team. Each person signs in with their own account and gets a role, such as associate advocate, junior advocate, clerk, receptionist or accountant, that decides what they can see and do. Juniors only see the cases they are assigned to unless you allow more.',
                'کیا میرا منشی اور جونیئرز اسی اکاؤنٹ میں کام کر سکتے ہیں؟',
                'جی ہاں۔ ٹیم کے صفحے سے انہیں ای میل کے ذریعے مدعو کریں۔ ہر شخص اپنے اکاؤنٹ سے سائن اِن کرتا ہے اور اسے ایک کردار ملتا ہے، جیسے ایسوسی ایٹ ایڈووکیٹ، جونیئر ایڈووکیٹ، منشی، ریسپشنسٹ یا اکاؤنٹنٹ، جو طے کرتا ہے کہ وہ کیا دیکھ اور کر سکتا ہے۔ جونیئرز صرف وہی مقدمات دیکھتے ہیں جو انہیں دیے گئے ہوں، جب تک آپ مزید اجازت نہ دیں۔'],
            ['Advocates and firms', false,
                'Do I need a law firm to use Da Barrister?',
                'No. Every advocate gets their own chambers automatically. You can later join a firm with the firm’s invite code or an invitation, and keep your own chambers as well.',
                'کیا دا بیرسٹر استعمال کرنے کے لیے لاء فرم ضروری ہے؟',
                'نہیں۔ ہر وکیل کو خود بخود اپنا چیمبر ملتا ہے۔ بعد میں آپ فرم کے انوائٹ کوڈ یا دعوت سے کسی فرم میں شامل ہو سکتے ہیں، اور اپنا چیمبر بھی برقرار رکھ سکتے ہیں۔'],
            ['Advocates and firms', false,
                'How do hearing reminders work?',
                'Reminders go out by email and in the notification bell before each hearing; by default 7, 3 and 1 days before and on the day. Your firm can change these days in Settings. WhatsApp reminders are sent only to people who have agreed to receive them.',
                'سماعت کی یاد دہانیاں کیسے کام کرتی ہیں؟',
                'ہر سماعت سے پہلے یاد دہانیاں ای میل اور نوٹیفکیشن بیل میں آتی ہیں؛ عام طور پر 7، 3 اور 1 دن پہلے اور سماعت کے دن۔ آپ کی فرم سیٹنگز میں یہ دن تبدیل کر سکتی ہے۔ واٹس ایپ یاد دہانیاں صرف انہی لوگوں کو بھیجی جاتی ہیں جنہوں نے انہیں وصول کرنے کی اجازت دی ہو۔'],
            ['Advocates and firms', false,
                'Can I prepare a Wakalatnama or Power of Attorney?',
                'Yes. Choose the form, pick the case and client, and the details fill in from your records. You can edit the document before printing or saving it as PDF or Word. Check the wording for your matter; powers of attorney still need stamp paper and attestation as the law requires.',
                'کیا میں وکالت نامہ یا مختار نامہ تیار کر سکتا ہوں؟',
                'جی ہاں۔ فارم منتخب کریں، مقدمہ اور کلائنٹ چنیں، اور تفصیلات آپ کے ریکارڈ سے خود بھر جاتی ہیں۔ پرنٹ کرنے یا پی ڈی ایف یا ورڈ میں محفوظ کرنے سے پہلے آپ دستاویز میں ترمیم کر سکتے ہیں۔ اپنے معاملے کے مطابق الفاظ چیک کریں؛ مختار نامے کے لیے قانون کے مطابق اسٹامپ پیپر اور تصدیق اب بھی ضروری ہے۔'],
            ['Advocates and firms', false,
                'What does the AI assistant do with my data?',
                'It helps you outline issues and improve drafts. Names, CNIC numbers, phone numbers and similar personal details are masked before anything is sent, and we keep only a record that a request was made, not its text. Always check its output; it is not legal advice and does not replace your judgment. It is available on paid plans.',
                'اے آئی اسسٹنٹ میرے ڈیٹا کے ساتھ کیا کرتا ہے؟',
                'یہ مسائل کا خاکہ بنانے اور مسودے بہتر کرنے میں مدد کرتا ہے۔ کچھ بھی بھیجنے سے پہلے نام، شناختی کارڈ نمبر، فون نمبر اور اسی طرح کی ذاتی تفصیلات چھپا دی جاتی ہیں، اور ہم صرف یہ ریکارڈ رکھتے ہیں کہ درخواست کی گئی، اس کا متن نہیں۔ اس کے جواب ہمیشہ چیک کریں؛ یہ قانونی مشورہ نہیں اور آپ کی رائے کا متبادل نہیں۔ یہ ادا شدہ پلانز میں دستیاب ہے۔'],

            // Clients
            ['Clients', true,
                'How do I find and book an advocate?',
                'Search the directory by city, practice area or court and open an advocate’s profile. Choose Book appointment and pick a time from their consultation hours. The advocate accepts, declines or suggests another time, and you are told by email and in your account.',
                'میں وکیل کیسے تلاش اور بک کروں؟',
                'ڈائریکٹری میں شہر، قانونی شعبے یا عدالت کے لحاظ سے تلاش کریں اور وکیل کا پروفائل کھولیں۔ اپائنٹمنٹ بک کریں منتخب کریں اور ان کے مشاورتی اوقات میں سے وقت چنیں۔ وکیل قبول، انکار یا دوسرا وقت تجویز کرتا ہے، اور آپ کو ای میل اور اکاؤنٹ میں اطلاع ملتی ہے۔'],
            ['Clients', false,
                'Does Da Barrister charge clients for booking?',
                'No. Searching the directory, creating an account and booking a consultation are free. Any consultation or case fee is agreed directly between you and the advocate.',
                'کیا دا بیرسٹر بکنگ کی فیس لیتا ہے؟',
                'نہیں۔ ڈائریکٹری میں تلاش، اکاؤنٹ بنانا اور مشاورت بک کرنا مفت ہے۔ مشاورت یا مقدمے کی فیس آپ اور وکیل کے درمیان براہ راست طے ہوتی ہے۔'],
            ['Clients', false,
                'What can I see in the client portal?',
                'When your advocate invites you, the portal shows your case’s next hearing dates, updates they choose to share, documents shared with you, your invoices and receipts, and messages with your advocate. Internal notes and documents not shared with you stay private to the chambers.',
                'کلائنٹ پورٹل میں مجھے کیا نظر آتا ہے؟',
                'جب آپ کا وکیل آپ کو مدعو کرتا ہے تو پورٹل میں آپ کے مقدمے کی اگلی سماعت کی تاریخیں، وکیل کی شیئر کردہ اپ ڈیٹس، آپ کے ساتھ شیئر کی گئی دستاویزات، آپ کی انوائسز اور رسیدیں، اور وکیل کے ساتھ پیغامات نظر آتے ہیں۔ اندرونی نوٹس اور غیر شیئر شدہ دستاویزات چیمبر تک محدود رہتی ہیں۔'],
            ['Clients', false,
                'Will I get WhatsApp messages without asking?',
                'No. WhatsApp messages are sent only if you have agreed to receive them, and you can withdraw at any time from your account or by replying STOP.',
                'کیا مجھے بغیر اجازت واٹس ایپ پیغامات آئیں گے؟',
                'نہیں۔ واٹس ایپ پیغامات صرف اسی صورت میں بھیجے جاتے ہیں جب آپ نے انہیں وصول کرنے کی اجازت دی ہو، اور آپ کسی بھی وقت اپنے اکاؤنٹ سے یا STOP لکھ کر اجازت واپس لے سکتے ہیں۔'],
            ['Clients', false,
                'Is the information in articles legal advice?',
                'No. Articles and judgments on the site are general information. For your own matter, speak to an advocate.',
                'کیا مضامین میں دی گئی معلومات قانونی مشورہ ہے؟',
                'نہیں۔ سائٹ پر موجود مضامین اور فیصلے عمومی معلومات ہیں۔ اپنے معاملے کے لیے کسی وکیل سے بات کریں۔'],

            // Plans and billing
            ['Plans and billing', true,
                'Is there a free plan?',
                'Yes. The Basic plan is free and lets you start with a small number of cases and clients. Paid plans add unlimited cases and clients, more storage, WhatsApp reminders, the AI assistant and analytics, and start with a 14 day free trial. See Pricing for the current limits and prices.',
                'کیا کوئی مفت پلان ہے؟',
                'جی ہاں۔ بنیادی پلان مفت ہے اور آپ چند مقدمات اور کلائنٹس کے ساتھ آغاز کر سکتے ہیں۔ ادا شدہ پلانز میں لامحدود مقدمات اور کلائنٹس، زیادہ اسٹوریج، واٹس ایپ یاد دہانیاں، اے آئی اسسٹنٹ اور تجزیات شامل ہیں، اور یہ 14 دن کے مفت ٹرائل سے شروع ہوتے ہیں۔ موجودہ حدود اور قیمتوں کے لیے قیمتوں کا صفحہ دیکھیں۔'],
            ['Plans and billing', false,
                'How do I pay for a plan?',
                'Open Billing, choose a plan and pay with one of the methods shown, such as bank transfer or a mobile wallet, then upload the payment screenshot. Your plan is switched on as soon as our team confirms the payment, and you receive an email. Card payment is available where it is shown at checkout.',
                'میں پلان کی ادائیگی کیسے کروں؟',
                'بلنگ کھولیں، پلان منتخب کریں اور دکھائے گئے طریقوں میں سے کسی ایک سے ادائیگی کریں، جیسے بینک ٹرانسفر یا موبائل والیٹ، پھر ادائیگی کا اسکرین شاٹ اپ لوڈ کریں۔ ہماری ٹیم کی تصدیق ہوتے ہی آپ کا پلان فعال ہو جاتا ہے اور آپ کو ای میل ملتی ہے۔ جہاں چیک آؤٹ پر دکھایا جائے وہاں کارڈ سے ادائیگی بھی ممکن ہے۔'],
            ['Plans and billing', false,
                'What happens if my plan ends or I reach a limit?',
                'Nothing is deleted or hidden. You keep full access to your existing cases, clients and documents. You only cannot add more than the free plan allows until you renew or upgrade, and the upgrade options are shown when you reach a limit.',
                'اگر میرا پلان ختم ہو جائے یا حد پوری ہو جائے تو کیا ہوگا؟',
                'کچھ بھی حذف یا چھپایا نہیں جاتا۔ آپ کے موجودہ مقدمات، کلائنٹس اور دستاویزات تک مکمل رسائی رہتی ہے۔ صرف تجدید یا اپ گریڈ تک آپ مفت پلان کی حد سے زیادہ اضافہ نہیں کر سکتے، اور حد پوری ہونے پر اپ گریڈ کے آپشن دکھائے جاتے ہیں۔'],

            // Privacy and security
            ['Privacy and security', true,
                'Who can see my case files?',
                'Only members of your own chambers or firm, according to the role you give them. Other advocates and firms can never open your records, and clients see only what you share with them. Our staff do not read your case files.',
                'میری مقدمات کی فائلیں کون دیکھ سکتا ہے؟',
                'صرف آپ کے اپنے چیمبر یا فرم کے ارکان، اس کردار کے مطابق جو آپ انہیں دیں۔ دوسرے وکلاء اور فرمز کبھی آپ کا ریکارڈ نہیں کھول سکتے، اور کلائنٹس صرف وہی دیکھتے ہیں جو آپ ان کے ساتھ شیئر کریں۔ ہمارا عملہ آپ کی مقدمات کی فائلیں نہیں پڑھتا۔'],
            ['Privacy and security', false,
                'How are my documents protected?',
                'Uploaded case documents are stored privately, never at a public web address. They open only for members allowed to see them, every view and download is logged, and confidential documents are limited to senior members and cannot be shared with clients. Messages and case notes are stored encrypted.',
                'میری دستاویزات کیسے محفوظ رہتی ہیں؟',
                'اپ لوڈ کی گئی مقدمات کی دستاویزات نجی طور پر محفوظ کی جاتی ہیں، کسی عوامی ویب پتے پر نہیں۔ یہ صرف اجازت یافتہ ارکان کے لیے کھلتی ہیں، ہر بار دیکھنے اور ڈاؤن لوڈ کرنے کا ریکارڈ رکھا جاتا ہے، اور خفیہ دستاویزات سینئر ارکان تک محدود ہیں اور کلائنٹس سے شیئر نہیں کی جا سکتیں۔ پیغامات اور مقدمے کے نوٹس انکرپٹڈ شکل میں محفوظ ہوتے ہیں۔'],
            ['Privacy and security', false,
                'Does Da Barrister file anything in court for me?',
                'No. Da Barrister helps you organise and prepare. You review, sign and file every document yourself.',
                'کیا دا بیرسٹر میرے لیے عدالت میں کچھ دائر کرتا ہے؟',
                'نہیں۔ دا بیرسٹر آپ کو ترتیب اور تیاری میں مدد دیتا ہے۔ ہر دستاویز آپ خود چیک کرتے، دستخط کرتے اور دائر کرتے ہیں۔'],
            ['Privacy and security', false,
                'Can I delete my account?',
                'Yes. Request deletion from Account settings and our team will process it. Records that belong to a firm stay with that firm, and some billing records are kept as long as the law requires.',
                'کیا میں اپنا اکاؤنٹ حذف کر سکتا ہوں؟',
                'جی ہاں۔ اکاؤنٹ سیٹنگز سے حذف کرنے کی درخواست دیں، ہماری ٹیم اس پر کارروائی کرے گی۔ جو ریکارڈ کسی فرم کا ہے وہ اسی فرم کے پاس رہتا ہے، اور بلنگ کے کچھ ریکارڈ قانون کے مطابق مدت تک رکھے جاتے ہیں۔'],

            // Judgments and research
            ['Judgments and research', false,
                'Where do the reported judgments come from?',
                'They are judgments that the High Courts have approved for reporting, taken from the courts’ own websites, with a link to the court’s copy. Search by court, judge, year, case number or citation. Always rely on the certified copy before citing a judgment.',
                'رپورٹ شدہ فیصلے کہاں سے آتے ہیں؟',
                'یہ وہ فیصلے ہیں جنہیں ہائی کورٹس نے رپورٹنگ کے لیے منظور کیا، اور یہ عدالتوں کی اپنی ویب سائٹس سے لیے جاتے ہیں، عدالت کی کاپی کے لنک کے ساتھ۔ عدالت، جج، سال، کیس نمبر یا حوالہ (سائٹیشن) سے تلاش کریں۔ کسی فیصلے کا حوالہ دینے سے پہلے ہمیشہ مصدقہ کاپی پر انحصار کریں۔'],
            ['Judgments and research', false,
                'How do I contact support?',
                'Use the Contact page, or Feedback from inside your account. You receive a reference number by email and we reply to the email you used.',
                'میں سپورٹ سے کیسے رابطہ کروں؟',
                'رابطہ صفحہ استعمال کریں، یا اپنے اکاؤنٹ کے اندر سے فیڈ بیک بھیجیں۔ آپ کو ای میل پر حوالہ نمبر ملتا ہے اور ہم اسی ای میل پر جواب دیتے ہیں جو آپ نے استعمال کی۔'],
        ];
    }
}
