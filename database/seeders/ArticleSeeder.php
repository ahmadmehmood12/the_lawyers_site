<?php

namespace Database\Seeders;

use App\Enums\AccountType;
use App\Enums\ArticleStatus;
use App\Enums\PlatformRole;
use App\Models\Article;
use App\Models\ArticleCategory;
use App\Models\Tag;
use App\Models\User;
use App\Support\HtmlSanitizer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Legal-awareness articles for the public library (docs/Modules/Articles.md).
 *
 * - Idempotent: categories, tags and articles are matched by slug, so re-running updates
 *   instead of duplicating.
 * - Content explains statutes and procedure in general terms; it cites no case law and
 *   every article ends with a "not legal advice" note. Have counsel review before launch.
 * - Authors: the demo advocates when they exist (local), otherwise an "Editorial Team"
 *   platform account that cannot sign in. No cover images are invented.
 */
class ArticleSeeder extends Seeder
{
    private const NOTE = '<p><em>This article is general information about Pakistani law, not legal advice. Laws and procedures change and differ between provinces; check the current text from an official source and speak to an advocate about your situation.</em></p>';

    private const NOTE_UR = '<p><em>یہ مضمون پاکستانی قانون کے بارے میں عمومی معلومات ہے، قانونی مشورہ نہیں۔ قوانین اور طریقہ کار بدلتے رہتے ہیں اور صوبوں میں مختلف ہو سکتے ہیں؛ سرکاری ذریعے سے موجودہ متن دیکھیں اور اپنے معاملے پر کسی وکیل سے مشورہ کریں۔</em></p>';

    public function run(): void
    {
        $categories = collect([
            'constitutional-law' => ['Constitutional Rights', 'آئینی حقوق'],
            'criminal-law' => ['Criminal Law', 'فوجداری قانون'],
            'family-law' => ['Family Law', 'عائلی قانون'],
            'property-law' => ['Property and Tenancy', 'جائیداد اور کرایہ داری'],
            'courts-procedure' => ['Courts and Procedure', 'عدالتیں اور طریقہ کار'],
            'cyber-law' => ['Cyber Law', 'سائبر قانون'],
            'legal-awareness' => ['Legal Awareness', 'قانونی آگاہی'],
        ])->mapWithKeys(fn ($names, $slug) => [$slug => ArticleCategory::query()->updateOrCreate(['slug' => $slug], ['name' => $names[0], 'name_ur' => $names[1]])]);

        $authors = User::query()->whereIn('email', ['ayesha@wakeel.test', 'firm@wakeel.test', 'associate@wakeel.test'])->orderBy('id')->get();
        if ($authors->isEmpty()) {
            $authors = collect([User::query()->firstOrCreate(
                ['email' => 'editorial@wakeeldiary.local'],
                ['name' => 'WakeelDiary Editorial Team', 'password' => Str::random(64), 'account_type' => AccountType::Platform, 'locale' => 'en'],
            )]);
        }
        $approver = User::role(PlatformRole::SuperAdmin->value)->orderBy('id')->first();

        foreach ($this->articles() as $i => $article) {
            $model = Article::query()->withTrashed()->updateOrCreate(['slug' => $article['slug']], [
                'author_id' => $authors[$i % $authors->count()]->id,
                'article_category_id' => $categories[$article['category']]->id,
                'title' => $article['title'],
                'language' => $article['language'],
                'excerpt' => $article['excerpt'],
                'body' => HtmlSanitizer::clean($article['body'].($article['language'] === 'ur' ? self::NOTE_UR : self::NOTE)),
                'cover_path' => null,
                'status' => ArticleStatus::Published,
                'published_at' => now()->subDays($article['days_ago'])->setTime(10, 0),
                'approved_by' => $approver?->id,
                'rejection_reason' => null,
            ]);
            if ($model->trashed()) {
                $model->restore();
            }
            $model->tags()->sync(collect($article['tags'])->map(fn (string $name) => Tag::query()->firstOrCreate(['slug' => Str::slug($name)], ['name' => $name])->id));
        }
    }

    /** @return list<array{slug: string, title: string, category: string, language: string, days_ago: int, excerpt: string, tags: list<string>, body: string}> */
    private function articles(): array
    {
        return [
            [
                'slug' => 'right-to-fair-trial-article-10a',
                'title' => 'Your right to a fair trial under Article 10A of the Constitution',
                'category' => 'constitutional-law', 'language' => 'en', 'days_ago' => 4,
                'tags' => ['Fundamental rights', 'Fair trial', 'Constitution'],
                'excerpt' => 'Article 10A guarantees every person a fair trial and due process in civil and criminal matters. Here is what that means in practice.',
                'body' => '<p>Article 10A was added to the Constitution of Pakistan by the Eighteenth Amendment in 2010. It says that for the determination of civil rights and obligations, or in any criminal charge, a person is entitled to a fair trial and due process.</p>'
                    .'<h2>What a fair trial includes</h2><ul><li><strong>Notice:</strong> you must know the case against you and have time to prepare.</li><li><strong>A hearing:</strong> you are heard before a decision is made against you.</li><li><strong>An impartial court:</strong> the judge must have no personal interest in the outcome.</li><li><strong>A reasoned decision:</strong> courts explain why they decide as they do, which also makes appeal possible.</li></ul>'
                    .'<h2>Safeguards on arrest</h2><p>Article 10 adds specific protections when someone is arrested: they must be told the grounds of arrest as soon as possible, may consult and be defended by a legal practitioner of their choice, and must be produced before a magistrate within 24 hours (excluding travel time). Detention beyond that needs the magistrate&rsquo;s authority.</p>'
                    .'<h2>How the right is enforced</h2><p>A breach of fundamental rights can be raised before the court hearing the case, in appeal, or through a constitutional petition before the High Court under Article 199. The Supreme Court may also act under Article 184(3) in matters of public importance involving fundamental rights.</p>',
            ],
            [
                'slug' => 'bail-in-pakistan-pre-arrest-and-post-arrest',
                'title' => 'Bail in Pakistan: pre-arrest and post-arrest bail explained',
                'category' => 'criminal-law', 'language' => 'en', 'days_ago' => 9,
                'tags' => ['Bail', 'CrPC', 'Criminal procedure'],
                'excerpt' => 'Bailable and non-bailable offences, the prohibitory clause, and when the courts grant protective (pre-arrest) bail.',
                'body' => '<p>Bail releases an accused person from custody while the case continues, on the promise (usually backed by a surety bond) to appear when required. It is not an acquittal, and refusing bail is not meant to be a punishment.</p>'
                    .'<h2>Bailable and non-bailable offences</h2><p>The Code of Criminal Procedure, 1898 lists in its second schedule whether an offence is bailable. In a bailable offence, bail is a right under Section 496 and the police or court must release the person on bail. In a non-bailable offence, Section 497 gives the court discretion.</p>'
                    .'<h2>The prohibitory clause</h2><p>Section 497 restricts bail where there are reasonable grounds to believe the accused committed an offence punishable with death, imprisonment for life or imprisonment for ten years. Even then, courts consider whether the case needs &ldquo;further inquiry&rdquo;, and special protection exists for women, minors and the sick or infirm.</p>'
                    .'<h2>Post-arrest and pre-arrest bail</h2><ul><li><strong>Post-arrest bail</strong> is sought after arrest, first usually before the magistrate or Sessions Court, and then the High Court.</li><li><strong>Pre-arrest (protective) bail</strong> is sought under Section 498 before arrest. Courts grant it sparingly, mainly where the accused shows the case may be motivated by mala fide intent to humiliate them.</li></ul>'
                    .'<h2>What to prepare</h2><p>A certified copy of the FIR, any medical or recovery reports, and documents showing a fixed address and family ties help the court assess the risk of absconding.</p>',
            ],
            [
                'slug' => 'how-to-register-an-fir-section-154',
                'title' => 'How to register an FIR, and what to do if the police refuse',
                'category' => 'criminal-law', 'language' => 'en', 'days_ago' => 15,
                'tags' => ['FIR', 'Police', 'Justice of Peace'],
                'excerpt' => 'Section 154 CrPC requires the police to record information about a cognizable offence. If they refuse, the law gives you a remedy.',
                'body' => '<p>A First Information Report (FIR) is the written record of information given to the police about a cognizable offence, meaning one in which the police may arrest without a warrant.</p>'
                    .'<h2>What Section 154 requires</h2><p>When information about a cognizable offence is given to the officer in charge of a police station, it must be written down, read over to the informant and signed by them. The substance is entered in the station register, and the informant is entitled to a copy free of cost.</p>'
                    .'<h2>Non-cognizable matters</h2><p>For non-cognizable offences, Section 155 applies: the police record the information but cannot investigate without an order from a magistrate.</p>'
                    .'<h2>If the police refuse</h2><ol><li>Send the written information to the Superintendent of Police by post or in person.</li><li>Apply to the Justice of Peace under Section 22-A CrPC. Sessions Judges and nominated Additional Sessions Judges act as ex-officio Justices of Peace and can direct the police to act in accordance with law.</li><li>Alternatively, file a private complaint directly before a magistrate.</li></ol>'
                    .'<h2>Tips</h2><p>Write down dates, times, names of witnesses and any medical treatment. Keep copies of everything you hand over, and note the FIR number, police station and the name of the investigating officer.</p>',
            ],
            [
                'slug' => 'khula-dissolution-of-marriage-pakistan',
                'title' => 'Khula: how a woman can seek dissolution of marriage in Pakistan',
                'category' => 'family-law', 'language' => 'en', 'days_ago' => 21,
                'tags' => ['Khula', 'Family Court', 'Divorce'],
                'excerpt' => 'The Family Courts Act and the Dissolution of Muslim Marriages Act give women a judicial route out of a marriage. Here is the process.',
                'body' => '<p>A Muslim woman in Pakistan can seek dissolution of her marriage through the Family Court, either on the grounds listed in the Dissolution of Muslim Marriages Act, 1939 or by way of <em>khula</em>.</p>'
                    .'<h2>Grounds under the 1939 Act</h2><p>The Act lists grounds such as the husband&rsquo;s whereabouts being unknown for four years, failure to maintain for two years, cruelty, and other grounds recognised as valid for dissolution under Muslim law.</p>'
                    .'<h2>Khula through the Family Court</h2><p>Under the Family Courts Act, 1964, the suit is filed in the Family Court with jurisdiction. At the pre-trial stage the court attempts reconciliation. If reconciliation fails, Section 10(4) allows the court to pass a decree of dissolution by way of khula, and it may direct the return of the dower or benefits received from the husband.</p>'
                    .'<h2>After the decree</h2><p>A copy of the decree is sent to the Union Council chairman, and the procedure in Section 8 of the Muslim Family Laws Ordinance, 1961 applies, including the reconciliation period before the dissolution takes effect.</p>'
                    .'<h2>Related claims</h2><p>Maintenance, dowry articles and custody of children can be claimed in the same Family Court, often together in one suit.</p>',
            ],
            [
                'slug' => 'child-custody-and-maintenance-family-court',
                'title' => 'Child custody and maintenance: what the Family Court looks at',
                'category' => 'family-law', 'language' => 'en', 'days_ago' => 30,
                'tags' => ['Custody', 'Maintenance', 'Guardians and Wards Act'],
                'excerpt' => 'Custody decisions turn on the welfare of the child. Maintenance is decided on the father’s means and the child’s needs.',
                'body' => '<p>Custody (<em>hizanat</em>) and guardianship are related but different. The father is generally treated as the natural guardian of a minor&rsquo;s person and property, while custody of young children is commonly given to the mother. Neither rule is absolute.</p>'
                    .'<h2>The welfare of the minor comes first</h2><p>Under the Guardians and Wards Act, 1890, the court decides custody and visitation by asking what serves the welfare of the child: age, gender, health, education, the emotional bond with each parent, and the child&rsquo;s own preference if old enough to form one. A parent&rsquo;s remarriage or conduct may be relevant but is weighed against the child&rsquo;s interest.</p>'
                    .'<h2>Visitation</h2><p>The parent without custody is usually given a visitation schedule. Courts can also order meetings in safe settings, and video calls have become common.</p>'
                    .'<h2>Maintenance</h2><p>The father is responsible for maintaining his children. The Family Court fixes an amount based on his means and the child&rsquo;s needs, and can order interim maintenance early in the case. Decrees are enforceable like money decrees.</p>'
                    .'<h2>Evidence that helps</h2><p>School fee vouchers, medical bills, proof of the father&rsquo;s income or lifestyle, and a realistic monthly budget make the court&rsquo;s task easier and the order more accurate.</p>',
            ],
            [
                'slug' => 'buying-property-in-pakistan-checks-before-you-pay',
                'title' => 'Buying property in Pakistan: checks before you pay',
                'category' => 'property-law', 'language' => 'en', 'days_ago' => 38,
                'tags' => ['Property', 'Sale deed', 'Land records'],
                'excerpt' => 'Verify title, mutation and dues before paying for land or a house. A registered sale deed is what protects you.',
                'body' => '<p>Most property disputes start with a sale that skipped basic checks. These steps reduce the risk.</p>'
                    .'<h2>1. Verify the seller and the title</h2><p>Match the seller&rsquo;s CNIC with the land record. Obtain a copy of the record of rights (<em>fard</em>) and check the mutation (<em>intiqal</em>) history. In Punjab, rural land records are maintained by the Punjab Land Records Authority through its service centres; in housing societies, check the society&rsquo;s transfer record.</p>'
                    .'<h2>2. Look for encumbrances and disputes</h2><p>Ask whether the property is mortgaged, under litigation, or subject to a stay order. Inquire at the relevant sub-registrar office and, where possible, search for pending cases.</p>'
                    .'<h2>3. Check approvals and dues</h2><p>For plots in societies, confirm the society is approved by the development authority and obtain an NOC. Clear outstanding property tax, utility bills and society dues before transfer.</p>'
                    .'<h2>4. Execute and register the sale deed</h2><p>Under the Transfer of Property Act, 1882 a sale of immovable property worth one hundred rupees or more is made by a registered instrument, and the Registration Act, 1908 makes registration compulsory. Pay the applicable stamp duty and taxes, and then complete the mutation in your name.</p>'
                    .'<h2>5. Pay through traceable channels</h2><p>Use bank transfers or pay orders and keep receipts. Cash payments are hard to prove later.</p>',
            ],
            [
                'slug' => 'tenant-and-landlord-rights-rented-premises',
                'title' => 'Tenant and landlord: rights under the rented premises laws',
                'category' => 'property-law', 'language' => 'en', 'days_ago' => 47,
                'tags' => ['Rent', 'Tenancy', 'Eviction'],
                'excerpt' => 'Provincial rent laws govern tenancies. A written, registered agreement and a record of rent payments prevent most disputes.',
                'body' => '<p>Tenancies in Pakistan are governed by provincial laws, for example the Punjab Rented Premises Act, 2009 and the Sindh Rented Premises Ordinance, 1979. Disputes are heard by a Rent Tribunal or Rent Controller rather than an ordinary civil court.</p>'
                    .'<h2>The tenancy agreement</h2><p>Put the agreement in writing: rent, increases, security deposit, duration and who pays for repairs and utilities. In Punjab the 2009 Act requires tenancies to be in writing and the agreement to be registered with the Rent Registrar.</p>'
                    .'<h2>Common grounds for eviction</h2><ul><li>Default in paying rent.</li><li>Subletting without the landlord&rsquo;s consent.</li><li>Using the premises for a purpose other than agreed, or causing damage.</li><li>The landlord&rsquo;s genuine personal need, where the law allows it.</li><li>Expiry of the tenancy period.</li></ul>'
                    .'<h2>If the landlord refuses to accept rent</h2><p>Keep paying through a traceable method or deposit the rent with the tribunal as the law provides, so that you are not treated as a defaulter.</p>'
                    .'<h2>Keep records</h2><p>Receipts, bank statements and photographs of the premises at the start and end of the tenancy are the evidence that settles most cases.</p>',
            ],
            [
                'slug' => 'cyber-harassment-and-peca-2016',
                'title' => 'Cyber harassment and online abuse: what the law offers',
                'category' => 'cyber-law', 'language' => 'en', 'days_ago' => 55,
                'tags' => ['Cyber crime', 'PECA', 'Harassment'],
                'excerpt' => 'The Prevention of Electronic Crimes Act, 2016 covers cyberstalking, sharing intimate images and attacks on a person’s dignity online.',
                'body' => '<p>The Prevention of Electronic Crimes Act, 2016 (PECA) created offences for misuse of information systems, including cyberstalking, sharing or threatening to share intimate images without consent, and false information that harms a person&rsquo;s dignity. The Act has been amended since, so check the current text.</p>'
                    .'<h2>Where to complain</h2><p>Complaints go to the federal agency responsible for cybercrime, which runs an online complaint portal and regional offices. Historically this was the FIA Cyber Crime Wing; confirm the current authority before filing.</p>'
                    .'<h2>Preserve evidence first</h2><ul><li>Take screenshots that show the profile name, URL, date and time.</li><li>Save links, usernames and phone numbers involved.</li><li>Do not delete chats, even unpleasant ones.</li><li>Report the content to the platform as well; most remove intimate images quickly.</li></ul>'
                    .'<h2>Other remedies</h2><p>Depending on the facts, civil defamation claims, harassment complaints at the workplace, and protection orders under provincial laws may also be available.</p>',
            ],
            [
                'slug' => 'writ-petition-article-199-high-court',
                'title' => 'Writ petitions: when you can go to the High Court under Article 199',
                'category' => 'courts-procedure', 'language' => 'en', 'days_ago' => 63,
                'tags' => ['Writ', 'High Court', 'Constitution'],
                'excerpt' => 'Article 199 lets the High Court correct unlawful acts of public bodies when no other adequate remedy exists.',
                'body' => '<p>Article 199 of the Constitution gives each High Court power to issue orders, commonly called writs, against persons performing functions in connection with the affairs of the Federation, a Province or a local authority.</p>'
                    .'<h2>The main kinds of writ</h2><ul><li><strong>Mandamus:</strong> directs a public official to do what the law requires them to do.</li><li><strong>Prohibition:</strong> stops a body from acting without lawful authority.</li><li><strong>Certiorari:</strong> declares an order made without lawful authority to be of no legal effect.</li><li><strong>Habeas corpus:</strong> requires a detained person to be produced so the court can check the detention is lawful.</li><li><strong>Quo warranto:</strong> asks a person holding public office to show by what authority they hold it.</li></ul>'
                    .'<h2>The adequate remedy rule</h2><p>Writ jurisdiction is generally used only where no other adequate remedy is provided by law. If a statute offers an appeal or revision, the court usually expects you to use it first.</p>'
                    .'<h2>Delay matters</h2><p>There is no fixed limitation period for writs, but unexplained delay (laches) can lead the court to refuse relief. Act promptly and keep records of every representation you make to the department.</p>',
            ],
            [
                'slug' => 'how-to-read-and-find-court-judgments',
                'title' => 'How to find and read a court judgment in Pakistan',
                'category' => 'courts-procedure', 'language' => 'en', 'days_ago' => 72,
                'tags' => ['Judgments', 'Precedent', 'Law reports'],
                'excerpt' => 'Where judgments are published, which decisions bind which courts, and the parts of a judgment that matter.',
                'body' => '<p>Court decisions shape how the law is applied. Knowing where to find them and how to read them helps both lawyers and litigants.</p>'
                    .'<h2>Where judgments are published</h2><p>The Supreme Court and the High Courts publish many judgments on their official websites. Reported judgments also appear in law reports such as PLD, SCMR, CLC, YLR, PCrLJ and MLD, cited by year, court and page.</p>'
                    .'<h2>Which decisions bind which courts</h2><p>Under Article 189 of the Constitution, a decision of the Supreme Court that decides a question of law or is based upon or enunciates a principle of law binds all other courts in Pakistan. Under Article 201, a High Court&rsquo;s decision binds the courts subordinate to it.</p>'
                    .'<h2>Reading a judgment</h2><ol><li><strong>Facts:</strong> what happened and how the case reached this court.</li><li><strong>Issues:</strong> the questions the court had to answer.</li><li><strong>Arguments:</strong> each side&rsquo;s position.</li><li><strong>Reasoning (ratio):</strong> the legal principle the decision rests on, which is what binds later courts.</li><li><strong>Order:</strong> the final relief granted or refused.</li></ol>'
                    .'<h2>Check it is still good law</h2><p>A judgment may have been overruled, distinguished or set aside on appeal. Always check later decisions before relying on one.</p>',
            ],
            [
                'slug' => 'limitation-act-time-limits-urdu',
                'title' => 'مقدمات کی حدِ میعاد: وقت پر دعویٰ کیوں ضروری ہے',
                'category' => 'courts-procedure', 'language' => 'ur', 'days_ago' => 80,
                'tags' => ['Limitation', 'Civil procedure'],
                'excerpt' => 'قانونِ میعاد 1908 کے تحت ہر دعوے، اپیل اور درخواست کی ایک مدت مقرر ہے۔ مدت گزرنے کے بعد دائر کیا گیا دعویٰ خارج ہو سکتا ہے۔',
                'body' => '<p>قانونِ میعاد، 1908 (Limitation Act) ہر قسم کے دعوے، اپیل اور درخواست کے لیے ایک مقررہ مدت طے کرتا ہے۔ یہ مدت عموماً اس دن سے شروع ہوتی ہے جب دعوے کا حق پیدا ہوا۔</p>'
                    .'<h2>مدت گزر جائے تو کیا ہوتا ہے؟</h2><p>دفعہ 3 کے تحت مقررہ مدت کے بعد دائر کیا گیا دعویٰ، اپیل یا درخواست خارج کر دی جاتی ہے، چاہے فریقِ مخالف یہ اعتراض نہ بھی اٹھائے۔ عدالت خود یہ دیکھنے کی پابند ہے۔</p>'
                    .'<h2>تاخیر کی معافی</h2><p>دفعہ 5 کے تحت اپیل اور بعض درخواستوں میں اگر معقول وجہ ثابت ہو تو عدالت تاخیر معاف کر سکتی ہے، مگر یہ رعایت عام دیوانی دعووں پر لاگو نہیں ہوتی۔ ہر دن کی تاخیر کی وضاحت دینی پڑ سکتی ہے۔</p>'
                    .'<h2>عملی مشورہ</h2><ul><li>کسی بھی تنازعے کی اہم تاریخیں لکھ کر رکھیں۔</li><li>فیصلے یا حکم کی مصدقہ نقل جلد حاصل کریں، کیونکہ اپیل کی مدت اکثر اسی سے متعلق ہوتی ہے۔</li><li>شک ہو تو فوراً وکیل سے رابطہ کریں؛ تاخیر کا نقصان بعد میں پورا نہیں ہوتا۔</li></ul>',
            ],
            [
                'slug' => 'free-legal-aid-in-pakistan-urdu',
                'title' => 'مفت قانونی امداد: وکیل کی فیس نہ ہو تو کہاں جائیں',
                'category' => 'legal-awareness', 'language' => 'ur', 'days_ago' => 88,
                'tags' => ['Legal aid', 'Access to justice'],
                'excerpt' => 'جو لوگ وکیل کی فیس ادا نہیں کر سکتے ان کے لیے بار کونسلوں، ضلعی کمیٹیوں اور سرکاری اداروں کے ذریعے مفت قانونی امداد دستیاب ہے۔',
                'body' => '<p>انصاف تک رسائی صرف ان لوگوں کا حق نہیں جو فیس ادا کر سکتے ہیں۔ پاکستان میں کئی ادارے مستحق افراد کو مفت قانونی مدد فراہم کرتے ہیں۔</p>'
                    .'<h2>مدد کہاں سے ملتی ہے</h2><ul><li><strong>بار کونسلوں کی مفت قانونی امداد کمیٹیاں:</strong> صوبائی بار کونسلیں اور پاکستان بار کونسل مستحق سائلین کے لیے وکیل مقرر کرتی ہیں۔</li><li><strong>ضلعی قانونی بااختیاری کمیٹیاں:</strong> ہر ضلع میں سیشن جج کی سربراہی میں قائم کمیٹیاں مستحق افراد کے مقدمات کا خرچ اٹھا سکتی ہیں۔</li><li><strong>لیگل ایڈ اینڈ جسٹس اتھارٹی:</strong> وفاقی سطح پر قائم یہ ادارہ خاص طور پر فوجداری مقدمات میں نادار ملزمان کی مدد کرتا ہے۔</li></ul>'
                    .'<h2>درخواست کیسے دیں</h2><p>عموماً تحریری درخواست کے ساتھ شناختی کارڈ کی نقل، مقدمے کی تفصیل اور آمدنی کے بارے میں بیان دینا ہوتا ہے۔ ضلعی کچہری میں بار ایسوسی ایشن کے دفتر یا سیشن کورٹ سے معلومات حاصل کی جا سکتی ہیں۔</p>'
                    .'<h2>یاد رکھیں</h2><p>مفت امداد کی شرائط اور طریقہ کار وقت کے ساتھ بدل سکتے ہیں، اس لیے متعلقہ ادارے سے تازہ معلومات ضرور لیں۔</p>',
            ],
        ];
    }
}
