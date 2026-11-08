import { useState } from 'react';
import { Briefcase, Building2, CheckCircle2, Printer } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, LinkButton } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { cn } from '@/lib/cn';
import { useLocale, useT } from '@/lib/i18n';

type Audience = 'lawyer' | 'firm';
type Section = { id: string; title: string; paragraphs?: string[]; steps?: string[]; bullets?: string[]; note?: string };
type Doc = { title: string; intro: string; sections: Section[] };
type Content = Record<Audience, Record<'en' | 'ur', Doc>>;

const content: Content = {
    lawyer: {
        en: {
            title: 'Documentation for advocates',
            intro: 'Everything you need to run a practice on this platform: registration, your public profile, verification, the court diary, cases, clients, documents, drafting, messages, billing and WhatsApp reminders.',
            sections: [
                {
                    id: 'register',
                    title: 'Create your account',
                    paragraphs: ['Registration takes a few minutes. Advocates must provide identity and Bar enrollment details; these are checked by the verification team and are never shown publicly.'],
                    steps: [
                        'Choose “Advocate” and enter your full name, email and Pakistani mobile number.',
                        'Enter your CNIC in the format 12345-1234567-1. This field is compulsory.',
                        'Select your Bar Council and enter your enrollment number exactly as printed on your licence.',
                        'Optionally add a referral code, coupon code, or a firm invite code if you are joining an existing firm.',
                        'Create a password and accept the Terms of Service and Privacy Policy.',
                    ],
                    note: 'If you enter a valid firm invite code, you join that firm as an associate advocate instead of creating your own chambers.',
                },
                {
                    id: 'profile',
                    title: 'Complete your professional profile',
                    paragraphs: ['A complete profile is what clients see in the directory. You decide when it is published.'],
                    bullets: [
                        'Professional headline and a biography in English and Urdu.',
                        'Profile photo, city, province and district.',
                        'Practice areas, courts you appear before, and languages you speak.',
                        'Education, experience, publications, certifications and awards.',
                        'Consultation fee range and whether you offer online or in-person consultations.',
                        'Availability: accepting new clients or not accepting at the moment.',
                    ],
                    note: 'Your CNIC is encrypted and hidden. Only your Bar Council and enrollment details are shown as verification evidence, and only after approval.',
                },
                {
                    id: 'verification',
                    title: 'Get the verified badge',
                    paragraphs: ['Verification confirms that a human reviewed your Bar enrollment evidence. It is not a guarantee of competence or of any case outcome.'],
                    steps: [
                        'Open Verification from your dashboard.',
                        'Upload clear images of your CNIC (front and back) and your Bar licence.',
                        'Submit the request. It moves to “submitted” and then “under review”.',
                        'If more information is needed, the officer requests it. You can upload again.',
                        'Once approved, the verified badge appears on your public profile.',
                    ],
                    note: 'Profiles that are rejected or suspended are removed from the public directory until resolved.',
                },
                {
                    id: 'diary',
                    title: 'Court diary and Court Mode',
                    paragraphs: ['The diary is the heart of the workspace. It is built for a phone in a court corridor.'],
                    bullets: [
                        'Day, week, month and agenda views with filters for court, case and advocate.',
                        'Court Mode: a large, high-contrast list of today’s cause list with one-tap status updates.',
                        'Add a hearing, change its date, record the order and set the next date.',
                        'Print or save the cause list as a PDF.',
                        'Hearing reminders are sent over WhatsApp and email according to client preferences.',
                    ],
                },
                {
                    id: 'cases',
                    title: 'Cases and case files',
                    paragraphs: ['Each case is a complete file: parties, court, judge, status, team and timeline.'],
                    bullets: [
                        'Open a case and link it to a client record.',
                        'Record hearings, orders, tasks and private notes.',
                        'Attach documents and drafts to the case.',
                        'Assign team members and track the next date and priority.',
                        'Search and filter by status, court, practice area and client.',
                    ],
                },
                {
                    id: 'clients',
                    title: 'Clients and the client portal',
                    paragraphs: ['Client records are private to your chambers. Clients can follow their matter through a secure portal.'],
                    bullets: [
                        'Create a client record and optionally invite them to the portal.',
                        'Share only what you choose: hearings, documents and updates.',
                        'Keep private notes that are never shown to the client.',
                        'Record contact details, CNIC and consent preferences.',
                    ],
                },
                {
                    id: 'documents',
                    title: 'Document vault and legal drafting',
                    paragraphs: ['Store files against cases or in the general vault, and draft documents from templates.'],
                    bullets: [
                        'Upload PDFs, Word files and images with categories and case links.',
                        'Use the drafting editor with numbered paragraphs, placeholders and legal formatting.',
                        'Start from a template, then review and approve the draft.',
                        'Export drafts as PDF or DOCX.',
                        'Access is controlled by role, not by link sharing.',
                    ],
                },
                {
                    id: 'messages',
                    title: 'Messages and appointments',
                    paragraphs: ['Keep client communication inside the workspace, with a clear record.'],
                    bullets: [
                        'Secure conversations per client and per case.',
                        'Set availability slots and accept online or in-person consultations.',
                        'Clients request an appointment; you confirm, reschedule or decline.',
                        'Unread counts appear in the sidebar and on the dashboard.',
                    ],
                },
                {
                    id: 'billing',
                    title: 'Invoices and payments',
                    paragraphs: ['Raise invoices, record payments and see what is overdue without leaving the workspace.'],
                    bullets: [
                        'Create an invoice with line items, tax and a due date.',
                        'Record full or partial payments and generate a receipt.',
                        'Track overdue balances on the dashboard.',
                        'Clients can see their invoices in the portal.',
                    ],
                },
                {
                    id: 'whatsapp',
                    title: 'WhatsApp reminders',
                    paragraphs: ['Reminders are sent through the official WhatsApp Business API to people who have consented to receive them.'],
                    bullets: [
                        'Choose which events trigger a reminder: hearing scheduled, rescheduled, cancelled, appointment and payment.',
                        'Templates are approved by Meta before use; the admin panel shows each template’s status.',
                        'Every delivery is logged with its status and any error.',
                        'Clients control their notification preferences.',
                    ],
                },
                {
                    id: 'codes',
                    title: 'Referral, coupon and firm invite codes',
                    paragraphs: ['Codes are optional and are entered during registration.'],
                    bullets: [
                        'A referral code records who referred you.',
                        'A coupon code may add trial days or a discount to your plan.',
                        'A firm invite code attaches you to an existing firm as an associate advocate.',
                        'Codes are validated against active, unexpired campaigns at the moment you register.',
                    ],
                },
                {
                    id: 'settings',
                    title: 'AI assistant, language and theme',
                    paragraphs: ['Your account settings control how the workspace looks and which helpers are enabled.'],
                    bullets: [
                        'The AI assistant can help draft and summarise; personal data can be masked before sending.',
                        'Switch between English and Urdu at any time; the layout follows the language direction.',
                        'Choose light, dark or system theme.',
                        'Manage password, two-factor authentication and active sessions.',
                    ],
                },
            ],
        },
        ur: {
            title: 'وکلاء کے لیے رہنمائی',
            intro: 'اس پلیٹ فارم پر اپنی پریکٹس چلانے کے لیے درکار ہر چیز: رجسٹریشن، عوامی پروفائل، تصدیق، کورٹ ڈائری، مقدمات، مؤکل، دستاویزات، ڈرافٹنگ، پیغامات، بلنگ اور واٹس ایپ یاد دہانیاں۔',
            sections: [
                {
                    id: 'register',
                    title: 'اپنا اکاؤنٹ بنائیں',
                    paragraphs: ['رجسٹریشن چند منٹ میں مکمل ہو جاتی ہے۔ وکلاء کو شناخت اور بار کونسل کی تفصیلات لازمی دینی ہوں گی۔ یہ تفصیلات تصدیقی ٹیم چیک کرتی ہے اور عوامی طور پر کبھی ظاہر نہیں کی جاتیں۔'],
                    steps: [
                        '’’وکیل‘‘ منتخب کریں اور اپنا مکمل نام، ای میل اور پاکستانی موبائل نمبر درج کریں۔',
                        'اپنا شناختی کارڈ 12345-1234567-1 کی صورت میں درج کریں۔ یہ خانہ لازمی ہے۔',
                        'اپنی بار کونسل منتخب کریں اور لائسنس پر درج انرولمنٹ نمبر بعینہٖ لکھیں۔',
                        'اختیاری طور پر ریفرل کوڈ، کوپن کوڈ یا فرم انوائٹ کوڈ درج کریں اگر آپ کسی موجودہ فرم میں شامل ہو رہے ہیں۔',
                        'پاس ورڈ بنائیں اور شرائطِ خدمت اور رازداری کی پالیسی قبول کریں۔',
                    ],
                    note: 'اگر آپ درست فرم انوائٹ کوڈ درج کرتے ہیں تو آپ اپنی چیمبرز بنانے کے بجائے اس فرم میں بطور ایسوسی ایٹ وکیل شامل ہو جاتے ہیں۔',
                },
                {
                    id: 'profile',
                    title: 'اپنی پیشہ ورانہ پروفائل مکمل کریں',
                    paragraphs: ['مکمل پروفائل وہی ہے جو مؤکل ڈائریکٹری میں دیکھتے ہیں۔ اشاعت کا فیصلہ آپ خود کرتے ہیں۔'],
                    bullets: [
                        'پیشہ ورانہ تعارف اور انگریزی و اردو میں سوانح۔',
                        'پروفائل تصویر، شہر، صوبہ اور ضلع۔',
                        'پریکٹس کے شعبے، جن عدالتوں میں پیش ہوتے ہیں، اور بولے جانے والے زبانوں کی معلومات۔',
                        'تعلیم، تجربہ، مطبوعات، سرٹیفیکیشن اور اعزازات۔',
                        'مشاورت کی فیس کی حد اور آن لائن یا بالمشافہ مشاورت کی دستیابی۔',
                        'دستیابی: نئے مؤکل قبول کر رہے ہیں یا نہیں۔',
                    ],
                    note: 'آپ کا شناختی کارڈ خفیہ رکھا جاتا ہے۔ بار کونسل اور انرولمنٹ کی تفصیلات صرف منظوری کے بعد تصدیقی ثبوت کے طور پر دکھائی جاتی ہیں۔',
                },
                {
                    id: 'verification',
                    title: 'تصدیق شدہ بیج حاصل کریں',
                    paragraphs: ['تصدیق کا مطلب ہے کہ کسی شخص نے آپ کے بار انرولمنٹ کے ثبوت کا جائزہ لیا ہے۔ یہ قابلیت یا مقدمے کے نتیجے کی ضمانت نہیں۔'],
                    steps: [
                        'ڈیش بورڈ سے تصدیق کا صفحہ کھولیں۔',
                        'شناختی کارڈ (سامنے اور پیچھے) اور بار لائسنس کی واضح تصاویر اپ لوڈ کریں۔',
                        'درخواست جمع کریں۔ حیثیت ’’جمع شدہ‘‘ اور پھر ’’زیرِ جائزہ‘‘ ہو جائے گی۔',
                        'اگر مزید معلومات درکار ہوں تو افسر درخواست کرے گا۔ آپ دوبارہ اپ لوڈ کر سکتے ہیں۔',
                        'منظوری کے بعد آپ کی عوامی پروفائل پر تصدیق شدہ بیج ظاہر ہوگا۔',
                    ],
                    note: 'مسترد یا معطل پروفائلز حل ہونے تک عوامی ڈائریکٹری سے ہٹا دی جاتی ہیں۔',
                },
                {
                    id: 'diary',
                    title: 'کورٹ ڈائری اور کورٹ موڈ',
                    paragraphs: ['ڈائری ورک اسپیس کا دل ہے۔ یہ عدالت کے کمرے میں موبائل پر استعمال کے لیے بنائی گئی ہے۔'],
                    bullets: [
                        'دن، ہفتہ، مہینہ اور ایجنڈا ویوز، عدالت، مقدمہ اور وکیل کے فلٹرز کے ساتھ۔',
                        'کورٹ موڈ: آج کی کاز لسٹ کی بڑی اور واضح فہرست، ایک ٹیپ میں حیثیت کی تبدیلی۔',
                        'سماعت شامل کریں، تاریخ تبدیل کریں، حکم نامہ درج کریں اور اگلی تاریخ مقرر کریں۔',
                        'کاز لسٹ پرنٹ کریں یا پی ڈی ایف میں محفوظ کریں۔',
                        'مؤکل کی ترجیحات کے مطابق واٹس ایپ اور ای میل پر سماعت کی یاد دہانیاں بھیجی جاتی ہیں۔',
                    ],
                },
                {
                    id: 'cases',
                    title: 'مقدمات اور مقدمہ فائلیں',
                    paragraphs: ['ہر مقدمہ ایک مکمل فائل ہے: فریقین، عدالت، جج، حیثیت، ٹیم اور ٹائم لائن۔'],
                    bullets: [
                        'مقدمہ کھولیں اور مؤکل کے ریکارڈ سے منسلک کریں۔',
                        'سماعتیں، احکامات، ٹاسک اور نجی نوٹس درج کریں۔',
                        'دستاویزات اور ڈرافٹ مقدمے کے ساتھ منسلک کریں۔',
                        'ٹیم ممبران مقرر کریں اور اگلی تاریخ و ترجیح پر نظر رکھیں۔',
                        'حیثیت، عدالت، شعبے اور مؤکل کے حساب سے تلاش و فلٹر کریں۔',
                    ],
                },
                {
                    id: 'clients',
                    title: 'مؤکل اور کلائنٹ پورٹل',
                    paragraphs: ['مؤکل کے ریکارڈ آپ کی چیمبرز کے لیے نجی ہیں۔ مؤکل محفوظ پورٹل کے ذریعے اپنا مقدمہ دیکھ سکتا ہے۔'],
                    bullets: [
                        'مؤکل کا ریکارڈ بنائیں اور چاہیں تو انہیں پورٹل کی دعوت دیں۔',
                        'صرف وہی شیئر کریں جو آپ چاہیں: سماعتیں، دستاویزات اور اپ ڈیٹس۔',
                        'نجی نوٹس رکھیں جو مؤکل کو کبھی نہیں دکھائے جاتے۔',
                        'رابطہ تفصیلات، شناختی کارڈ اور رضامندی کی ترجیحات محفوظ کریں۔',
                    ],
                },
                {
                    id: 'documents',
                    title: 'دستاویزات کا خزانہ اور قانونی ڈرافٹنگ',
                    paragraphs: ['فائلیں مقدمے کے ساتھ یا عمومی خزانے میں محفوظ کریں اور ٹیمپلیٹس سے ڈرافٹ تیار کریں۔'],
                    bullets: [
                        'پی ڈی ایف، ورڈ فائلیں اور تصاویر زمرہ جات اور مقدمے کے لنک کے ساتھ اپ لوڈ کریں۔',
                        'ڈرافٹنگ ایڈیٹر میں نمبر شدہ پیراگراف، پلیس ہولڈرز اور قانونی فارمیٹنگ استعمال کریں۔',
                        'ٹیمپلیٹ سے شروع کریں، پھر جائزہ لیں اور ڈرافٹ منظور کریں۔',
                        'ڈرافٹ کو پی ڈی ایف یا ڈی او سی ایکس میں برآمد کریں۔',
                        'رسائی لنک شیئر کرنے کے بجائے کردار کے ذریعے کنٹرول ہوتی ہے۔',
                    ],
                },
                {
                    id: 'messages',
                    title: 'پیغامات اور ملاقاتیں',
                    paragraphs: ['مؤکل سے رابطہ ورک اسپیس کے اندر رکھیں تاکہ واضح ریکارڈ موجود رہے۔'],
                    bullets: [
                        'ہر مؤکل اور مقدمے کے لیے محفوظ گفتگو۔',
                        'دستیابی کے اوقات مقرر کریں اور آن لائن یا بالمشافہ مشاورت قبول کریں۔',
                        'مؤکل ملاقات کی درخواست کرتا ہے؛ آپ تصدیق، تاریخ تبدیلی یا انکار کرتے ہیں۔',
                        'نہ پڑھے گئے پیغامات کی تعداد سائیڈبار اور ڈیش بورڈ پر دکھائی جاتی ہے۔',
                    ],
                },
                {
                    id: 'billing',
                    title: 'بل اور ادائیگیاں',
                    paragraphs: ['ورک اسپیس چھوڑے بغیر بل بنائیں، ادائیگیاں درج کریں اور واجبات دیکھیں۔'],
                    bullets: [
                        'اشیاء، ٹیکس اور آخری تاریخ کے ساتھ بل بنائیں۔',
                        'مکمل یا جزوی ادائیگی درج کریں اور رسید بنائیں۔',
                        'ڈیش بورڈ پر واجب الادا رقوم پر نظر رکھیں۔',
                        'مؤکل پورٹل میں اپنے بل دیکھ سکتے ہیں۔',
                    ],
                },
                {
                    id: 'whatsapp',
                    title: 'واٹس ایپ یاد دہانیاں',
                    paragraphs: ['یاد دہانیاں سرکاری واٹس ایپ بزنس اے پی آئی کے ذریعے صرف ان لوگوں کو بھیجی جاتی ہیں جنہوں نے رضامندی دی ہو۔'],
                    bullets: [
                        'منتخب کریں کہ کون سے واقعات یاد دہانی بھیجیں: سماعت مقرر، تبدیل، منسوخ، ملاقات اور ادائیگی۔',
                        'ٹیمپلیٹس استعمال سے پہلے میٹا سے منظور ہوتے ہیں؛ ایڈمن پینل ہر ٹیمپلیٹ کی حیثیت دکھاتا ہے۔',
                        'ہر ترسیل حیثیت اور ممکنہ خرابی کے ساتھ لاگ ہوتی ہے۔',
                        'مؤکل اپنی اطلاع کی ترجیحات خود کنٹرول کرتے ہیں۔',
                    ],
                },
                {
                    id: 'codes',
                    title: 'ریفرل، کوپن اور فرم انوائٹ کوڈز',
                    paragraphs: ['کوڈز اختیاری ہیں اور رجسٹریشن کے وقت درج کیے جاتے ہیں۔'],
                    bullets: [
                        'ریفرل کوڈ درج کرتا ہے کہ آپ کو کس نے ریفر کیا۔',
                        'کوپن کوڈ آپ کے پلان میں مفت دن یا رعایت شامل کر سکتا ہے۔',
                        'فرم انوائٹ کوڈ آپ کو موجودہ فرم میں بطور ایسوسی ایٹ وکیل منسلک کرتا ہے۔',
                        'رجسٹریشن کے وقت کوڈز کو فعال اور تاریخ کے اندر ہونے کی جانچ کی جاتی ہے۔',
                    ],
                },
                {
                    id: 'settings',
                    title: 'اے آئی اسسٹنٹ، زبان اور تھیم',
                    paragraphs: ['اکاؤنٹ کی ترتیبات طے کرتی ہیں کہ ورک اسپیس کیسی دکھے اور کون سی سہولیات فعال ہوں۔'],
                    bullets: [
                        'اے آئی اسسٹنٹ ڈرافٹنگ اور خلاصے میں مدد کرتا ہے؛ بھیجنے سے پہلے ذاتی معلومات چھپائی جا سکتی ہیں۔',
                        'کسی بھی وقت انگریزی اور اردو کے درمیان تبدیلی کریں؛ ترتیب زبان کی سمت کی پیروی کرتی ہے۔',
                        'روشن، تاریک یا سسٹم تھیم منتخب کریں۔',
                        'پاس ورڈ، دو مرحلہ تصدیق اور فعال سیشنز کا انتظام کریں۔',
                    ],
                },
            ],
        },
    },
    firm: {
        en: {
            title: 'Documentation for law firms',
            intro: 'Set up a firm, invite your advocates, and run a shared diary, case files, billing and analytics — with clear roles and permissions for every member.',
            sections: [
                {
                    id: 'register-firm',
                    title: 'Register the firm',
                    paragraphs: ['A firm account is owned by an advocate. The owner’s identity and Bar enrollment are compulsory, and the firm’s registration details are recorded on the firm profile.'],
                    steps: [
                        'Choose “Law Firm” on the registration page.',
                        'Enter the firm name and its registration number.',
                        'Enter the owner’s full name, email and mobile number.',
                        'Provide the owner’s CNIC, Bar Council and enrollment number.',
                        'Create a password and accept the Terms and Privacy Policy.',
                    ],
                    note: 'The firm starts on the platform’s default plan. You can change plans later from billing.',
                },
                {
                    id: 'invite',
                    title: 'Invite advocates with an invite code',
                    paragraphs: ['Every firm gets a unique invite code. Share it with advocates you want to join; they enter it when registering.'],
                    bullets: [
                        'Find the invite code on the firm settings or team page.',
                        'The advocate registers as “Advocate” and enters the code in the firm invite field.',
                        'They join as an associate advocate and see the firm workspace immediately.',
                        'Remove or change a member’s role from the team page.',
                        'The code can be regenerated if it has been shared too widely.',
                    ],
                },
                {
                    id: 'roles',
                    title: 'Roles and permissions',
                    paragraphs: ['Access is role-based. Every action is checked against the member’s role inside the firm.'],
                    bullets: [
                        'Owner: full control, billing and firm settings.',
                        'Senior and associate advocates: cases, diary, clients and drafting.',
                        'Junior advocates: assigned work with limited administrative access.',
                        'Legal assistants and clerks: diary, documents and tasks as permitted.',
                        'Receptionist: appointments and client contact. Accountant: invoices and payments.',
                    ],
                },
                {
                    id: 'shared-diary',
                    title: 'Shared diary and cause lists',
                    paragraphs: ['The firm diary combines every advocate’s hearings into one reliable cause list.'],
                    bullets: [
                        'Filter by advocate, court, case or date.',
                        'Court Mode gives a large, high-contrast view for the court corridor.',
                        'Print or export the firm-wide cause list as a PDF.',
                        'Hearing changes and outcomes update the shared record instantly.',
                    ],
                },
                {
                    id: 'shared-work',
                    title: 'Cases, clients and documents',
                    paragraphs: ['Work is shared inside the firm without exposing confidential material to the wrong people.'],
                    bullets: [
                        'Assign cases to one or more advocates and support staff.',
                        'Share client records with the team; keep private notes separate.',
                        'Store documents against cases or in the firm vault.',
                        'Use templates for consistent drafting across the firm.',
                        'Every change is recorded in the activity log.',
                    ],
                },
                {
                    id: 'firm-profile',
                    title: 'Publish the firm profile',
                    paragraphs: ['A public firm page helps clients find your team and understand your focus areas.'],
                    bullets: [
                        'Add a logo, description in English and Urdu, address, phone, email and website.',
                        'Record the registration number, NTN and founding year.',
                        'Choose the city and the practice areas your team focuses on.',
                        'Publish the page when it is ready; unpublish it at any time.',
                        'The page lists your publicly published advocates.',
                    ],
                },
                {
                    id: 'billing',
                    title: 'Billing, plans and limits',
                    paragraphs: ['Firm plans are billed separately from individual plans and include team, storage and reminder limits.'],
                    bullets: [
                        'See the current plan, trial status and renewal date.',
                        'Compare limits for team members, active cases, clients, storage, AI use and WhatsApp reminders.',
                        'Change plans without losing existing records.',
                        'Invoices and payment records stay available after a plan ends.',
                    ],
                },
                {
                    id: 'analytics',
                    title: 'Firm analytics',
                    paragraphs: ['Understand workload and revenue across the firm without exposing case content to the platform.'],
                    bullets: [
                        'Active cases by practice area and by court.',
                        'Hearings and outcomes over time.',
                        'Outstanding fees and monthly revenue.',
                        'Team workload by advocate.',
                    ],
                },
                {
                    id: 'notifications',
                    title: 'Notifications and WhatsApp',
                    paragraphs: ['Reminders go out through the official WhatsApp Business API and email, with a delivery log for the firm.'],
                    bullets: [
                        'Choose which events notify clients and team members.',
                        'Templates are approved by Meta before use.',
                        'Every delivery is logged with status and error details.',
                        'Clients control their own notification preferences.',
                    ],
                },
                {
                    id: 'security',
                    title: 'Security, privacy and data',
                    paragraphs: ['Firm data is isolated from other organizations and access is checked on every request.'],
                    bullets: [
                        'CNIC and other sensitive fields are encrypted at rest.',
                        'Role-based access controls what each member can see and do.',
                        'The audit log records administrative and security events.',
                        'Export or request deletion of account data; legal and financial records may be retained where required.',
                        'Platform staff see aggregates, not confidential case content.',
                    ],
                },
            ],
        },
        ur: {
            title: 'لاء فرم کے لیے رہنمائی',
            intro: 'فرم قائم کریں، اپنے وکلاء کو مدعو کریں، اور مشترکہ ڈائری، مقدمہ فائلیں، بلنگ اور تجزیات چلائیں — ہر ممبر کے لیے واضح کردار اور اجازتوں کے ساتھ۔',
            sections: [
                {
                    id: 'register-firm',
                    title: 'فرم رجسٹر کریں',
                    paragraphs: ['فرم اکاؤنٹ کا مالک ایک وکیل ہوتا ہے۔ مالک کی شناخت اور بار انرولمنٹ لازمی ہیں، اور فرم کی رجسٹریشن تفصیلات فرم پروفائل میں درج ہوتی ہیں۔'],
                    steps: [
                        'رجسٹریشن صفحے پر ’’لاء فرم‘‘ منتخب کریں۔',
                        'فرم کا نام اور اس کا رجسٹریشن نمبر درج کریں۔',
                        'مالک کا مکمل نام، ای میل اور موبائل نمبر درج کریں۔',
                        'مالک کا شناختی کارڈ، بار کونسل اور انرولمنٹ نمبر فراہم کریں۔',
                        'پاس ورڈ بنائیں اور شرائط و رازداری کی پالیسی قبول کریں۔',
                    ],
                    note: 'فرم پلیٹ فارم کے طے شدہ پلان پر شروع ہوتی ہے۔ بعد میں بلنگ سے پلان تبدیل کیا جا سکتا ہے۔',
                },
                {
                    id: 'invite',
                    title: 'انوائٹ کوڈ سے وکلاء کو مدعو کریں',
                    paragraphs: ['ہر فرم کو ایک منفرد انوائٹ کوڈ ملتا ہے۔ اسے ان وکلاء کے ساتھ شیئر کریں جنہیں آپ شامل کرنا چاہتے ہیں؛ وہ رجسٹریشن کے وقت یہ کوڈ درج کرتے ہیں۔'],
                    bullets: [
                        'انوائٹ کوڈ فرم کی ترتیبات یا ٹیم کے صفحے پر ملتا ہے۔',
                        'وکیل ’’وکیل‘‘ کے طور پر رجسٹر ہوتا ہے اور فرم انوائٹ خانے میں کوڈ درج کرتا ہے۔',
                        'وہ بطور ایسوسی ایٹ وکیل شامل ہوتا ہے اور فوراً فرم کا ورک اسپیس دیکھتا ہے۔',
                        'ٹیم کے صفحے سے ممبر کا کردار تبدیل یا ہٹایا جا سکتا ہے۔',
                        'اگر کوڈ زیادہ شیئر ہو جائے تو اسے دوبارہ بنا کر تبدیل کیا جا سکتا ہے۔',
                    ],
                },
                {
                    id: 'roles',
                    title: 'کردار اور اجازتیں',
                    paragraphs: ['رسائی کردار کی بنیاد پر ہوتی ہے۔ ہر عمل فرم کے اندر ممبر کے کردار کے مطابق جانچا جاتا ہے۔'],
                    bullets: [
                        'مالک: مکمل کنٹرول، بلنگ اور فرم کی ترتیبات۔',
                        'سینئر اور ایسوسی ایٹ وکیل: مقدمات، ڈائری، مؤکل اور ڈرافٹنگ۔',
                        'جونیئر وکیل: تفویض کردہ کام، محدود انتظامی رسائی۔',
                        'لیگل اسسٹنٹ اور کلرک: اجازت کے مطابق ڈائری، دستاویزات اور ٹاسک۔',
                        'ریسپشنسٹ: ملاقاتیں اور مؤکل رابطہ۔ اکاؤنٹنٹ: بل اور ادائیگیاں۔',
                    ],
                },
                {
                    id: 'shared-diary',
                    title: 'مشترکہ ڈائری اور کاز لسٹ',
                    paragraphs: ['فرم کی ڈائری ہر وکیل کی سماعتیں ایک قابلِ اعتماد کاز لسٹ میں یکجا کرتی ہے۔'],
                    bullets: [
                        'وکیل، عدالت، مقدمہ یا تاریخ کے حساب سے فلٹر کریں۔',
                        'کورٹ موڈ عدالت کے کمرے کے لیے بڑا اور واضح منظر دیتا ہے۔',
                        'فرم کی مکمل کاز لسٹ پرنٹ کریں یا پی ڈی ایف میں برآمد کریں۔',
                        'سماعت کی تبدیلیاں اور نتائج فوراً مشترکہ ریکارڈ میں اپ ڈیٹ ہوتے ہیں۔',
                    ],
                },
                {
                    id: 'shared-work',
                    title: 'مقدمات، مؤکل اور دستاویزات',
                    paragraphs: ['کام فرم کے اندر مشترکہ ہوتا ہے مگر خفیہ مواد غلط افراد تک نہیں پہنچتا۔'],
                    bullets: [
                        'مقدمات ایک یا زیادہ وکلاء اور معاون عملے کو تفویض کریں۔',
                        'مؤکل کے ریکارڈ ٹیم کے ساتھ شیئر کریں؛ نجی نوٹس الگ رکھیں۔',
                        'دستاویزات مقدمے کے ساتھ یا فرم کے خزانے میں محفوظ کریں۔',
                        'پوری فرم میں یکساں ڈرافٹنگ کے لیے ٹیمپلیٹس استعمال کریں۔',
                        'ہر تبدیلی ایکٹیویٹی لاگ میں درج ہوتی ہے۔',
                    ],
                },
                {
                    id: 'firm-profile',
                    title: 'فرم پروفائل شائع کریں',
                    paragraphs: ['عوامی فرم صفحہ مؤکلوں کو آپ کی ٹیم اور مہارت کے شعبے تلاش کرنے میں مدد دیتا ہے۔'],
                    bullets: [
                        'لوگو، انگریزی و اردو تفصیل، پتہ، فون، ای میل اور ویب سائٹ شامل کریں۔',
                        'رجسٹریشن نمبر، این ٹی این اور قیام کا سال درج کریں۔',
                        'شہر اور وہ پریکٹس شعبے منتخب کریں جن پر آپ کی ٹیم توجہ دیتی ہے۔',
                        'تیار ہونے پر صفحہ شائع کریں؛ کسی بھی وقت غیر شائع کریں۔',
                        'صفحہ آپ کے عوامی طور پر شائع شدہ وکلاء کی فہرست دکھاتا ہے۔',
                    ],
                },
                {
                    id: 'billing',
                    title: 'بلنگ، پلان اور حدود',
                    paragraphs: ['فرم کے پلان انفرادی پلان سے الگ بل کیے جاتے ہیں اور ان میں ٹیم، اسٹوریج اور یاد دہانیوں کی حدود شامل ہیں۔'],
                    bullets: [
                        'موجودہ پلان، آزمائشی حیثیت اور تجدید کی تاریخ دیکھیں۔',
                        'ٹیم ممبران، فعال مقدمات، مؤکل، اسٹوریج، اے آئی اور واٹس ایپ یاد دہانیوں کی حدود کا موازنہ کریں۔',
                        'موجودہ ریکارڈ ضائع کیے بغیر پلان تبدیل کریں۔',
                        'پلان ختم ہونے کے بعد بھی بل اور ادائیگی کے ریکارڈ دستیاب رہتے ہیں۔',
                    ],
                },
                {
                    id: 'analytics',
                    title: 'فرم کے تجزیات',
                    paragraphs: ['پلیٹ فارم کو مقدمے کا مواد دکھائے بغیر پوری فرم کے کام اور آمدنی کو سمجھیں۔'],
                    bullets: [
                        'شعبے اور عدالت کے حساب سے فعال مقدمات۔',
                        'وقت کے ساتھ سماعتیں اور نتائج۔',
                        'واجب الادا فیس اور ماہانہ آمدنی۔',
                        'وکیل کے حساب سے ٹیم کا کام۔',
                    ],
                },
                {
                    id: 'notifications',
                    title: 'اطلاعات اور واٹس ایپ',
                    paragraphs: ['یاد دہانیاں سرکاری واٹس ایپ بزنس اے پی آئی اور ای میل کے ذریعے جاتی ہیں، اور فرم کے لیے ترسیل کا لاگ موجود رہتا ہے۔'],
                    bullets: [
                        'منتخب کریں کہ کون سے واقعات مؤکل اور ٹیم کو مطلع کریں۔',
                        'ٹیمپلیٹس استعمال سے پہلے میٹا سے منظور ہوتے ہیں۔',
                        'ہر ترسیل حیثیت اور خرابی کی تفصیل کے ساتھ لاگ ہوتی ہے۔',
                        'مؤکل اپنی اطلاع کی ترجیحات خود کنٹرول کرتے ہیں۔',
                    ],
                },
                {
                    id: 'security',
                    title: 'سیکیورٹی، رازداری اور ڈیٹا',
                    paragraphs: ['فرم کا ڈیٹا دوسری تنظیموں سے الگ رکھا جاتا ہے اور ہر درخواست پر رسائی جانچی جاتی ہے۔'],
                    bullets: [
                        'شناختی کارڈ اور دیگر حساس معلومات محفوظ انداز میں خفیہ رکھی جاتی ہیں۔',
                        'کردار کی بنیاد پر رسائی طے کرتی ہے کہ ہر ممبر کیا دیکھ اور کر سکتا ہے۔',
                        'آڈٹ لاگ انتظامی اور سیکیورٹی واقعات درج کرتا ہے۔',
                        'اکاؤنٹ ڈیٹا برآمد یا حذف کی درخواست کریں؛ قانونی و مالی ریکارڈ جہاں ضروری ہو محفوظ رکھے جا سکتے ہیں۔',
                        'پلیٹ فارم عملہ مجموعی اعداد و شمار دیکھتا ہے، خفیہ مقدمہ مواد نہیں۔',
                    ],
                },
            ],
        },
    },
};

export default function Documentation({ canonical }: { canonical: string }) {
    const t = useT();
    const { locale } = useLocale();
    const [audience, setAudience] = useState<Audience>('lawyer');
    const lang = locale === 'ur' ? 'ur' : 'en';
    const doc = content[audience][lang];
    const other = audience === 'lawyer' ? 'firm' : 'lawyer';

    return (
        <PublicLayout seo={{ title: t('Documentation'), description: t('How advocates and law firms use the platform, in English and Urdu.'), canonical }}>
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                <nav aria-label="Breadcrumb" className="mb-2 text-xs text-navy-500"><a href={route('home')}>{t('Home')}</a> / {t('Documentation')}</nav>
                <header className="max-w-3xl">
                    <Badge tone="gold">{t('Guides')}</Badge>
                    <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{t('Documentation')}</h1>
                    <p className="mt-2 text-navy-600 dark:text-navy-300">
                        {t('Step-by-step guides for advocates and law firms. This page is available in English and Urdu — switch language in the header.')}
                    </p>
                </header>

                <div className="mt-6 flex flex-wrap items-center gap-2">
                    {(['lawyer', 'firm'] as const).map((value) => {
                        const Icon = value === 'lawyer' ? Briefcase : Building2;
                        const label = value === 'lawyer' ? t('For advocates') : t('For law firms');
                        return (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={audience === value}
                                onClick={() => setAudience(value)}
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                                    audience === value ? 'border-navy-900 bg-navy-900 text-white dark:border-gold-500 dark:bg-gold-500 dark:text-navy-950' : 'border-navy-200 text-navy-700 hover:border-navy-400 dark:border-navy-700 dark:text-navy-200',
                                )}
                            >
                                <Icon className="size-4" aria-hidden />
                                {label}
                            </button>
                        );
                    })}
                    <Button variant="ghost" size="sm" icon={<Printer className="size-4" />} onClick={() => window.print()}>{t('Print')}</Button>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 rounded-card border border-navy-100 bg-white p-4 dark:border-navy-800 dark:bg-navy-900">
                            <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">{t('On this page')}</p>
                            <ol className="mt-3 space-y-1.5 text-sm">
                                {doc.sections.map((section, index) => (
                                    <li key={section.id}>
                                        <a href={`#${section.id}`} className="flex gap-2 rounded px-1 py-1 text-navy-700 hover:bg-navy-50 hover:text-navy-900 dark:text-navy-300 dark:hover:bg-navy-800 dark:hover:text-white">
                                            <span className="w-4 shrink-0 text-xs text-navy-400">{index + 1}.</span>
                                            <span>{section.title}</span>
                                        </a>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </aside>

                    <div className="min-w-0 space-y-5">
                        <Card>
                            <CardHeader title={doc.title} description={doc.intro} />
                        </Card>

                        {doc.sections.map((section, index) => (
                            <section key={section.id} id={section.id} className="scroll-mt-24">
                                <Card>
                                    <CardHeader title={`${index + 1}. ${section.title}`} />
                                    <CardBody className="space-y-4">
                                        {section.paragraphs?.map((paragraph) => <p key={paragraph} className="text-sm leading-6 text-navy-700 dark:text-navy-200">{paragraph}</p>)}
                                        {section.steps && (
                                            <ol className="space-y-2">
                                                {section.steps.map((step, i) => (
                                                    <li key={step} className="flex gap-3 text-sm text-navy-700 dark:text-navy-200">
                                                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white dark:bg-gold-500 dark:text-navy-950">{i + 1}</span>
                                                        <span className="pt-0.5">{step}</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                        {section.bullets && (
                                            <ul className="space-y-2">
                                                {section.bullets.map((bullet) => (
                                                    <li key={bullet} className="flex gap-2 text-sm text-navy-700 dark:text-navy-200">
                                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-verdant-600" aria-hidden />
                                                        <span>{bullet}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {section.note && (
                                            <p className="rounded-lg border border-gold-200 bg-gold-50 px-3 py-2 text-sm text-gold-800 dark:border-gold-700/40 dark:bg-gold-700/15 dark:text-gold-200">
                                                {section.note}
                                            </p>
                                        )}
                                    </CardBody>
                                </Card>
                            </section>
                        ))}

                        <Card>
                            <CardBody className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold">{audience === 'lawyer' ? t('Ready to start your practice?') : t('Ready to set up your firm?')}</p>
                                    <p className="text-sm text-navy-600 dark:text-navy-300">{t('Create your account in a few minutes.')}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <LinkButton href={route('register', { type: audience })}>{t('Create account')}</LinkButton>
                                    <Button variant="secondary" onClick={() => setAudience(other)}>{other === 'lawyer' ? t('Read the advocate guide') : t('Read the law firm guide')}</Button>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
