<?php

namespace Database\Seeders;

use App\Models\DocumentTemplate;
use Illuminate\Database\Seeder;

/**
 * Starter legal forms (Admin, Legal forms): Wakalatnama, General Power of Attorney and Special Power
 * of Attorney for litigation. Common Pakistani formats; counsel should review the wording before use.
 * Powers of attorney still need stamp paper and attestation as the law requires. Safe to re-run.
 */
class LegalFormSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->forms() as $form) {
            DocumentTemplate::query()->updateOrCreate(
                ['organization_id' => null, 'kind' => 'form', 'title' => $form['title']],
                [...$form, 'review_status' => 'unreviewed', 'is_active' => true],
            );
        }
    }

    /** @return list<array<string, mixed>> */
    private function forms(): array
    {
        $f = fn (string $key, string $label, ?string $source = null, string $type = 'text', bool $required = true, ?string $hint = null) => compact('key', 'label', 'source', 'type', 'required', 'hint');

        $party = [
            $f('client_name', 'Client full name', 'client.name'),
            $f('client_relation', 'Son, daughter or wife of', null, 'text', false, 'Father or husband name'),
            $f('client_cnic', 'Client CNIC', 'client.cnic', 'text', false),
            $f('client_address', 'Client address', 'client.address', 'textarea'),
        ];
        $advocate = [
            $f('advocate_name', 'Advocate name', 'lawyer.name'),
            $f('enrollment', 'Enrollment number', 'lawyer.enrollment', 'text', false),
            $f('bar_council', 'Bar Council', 'lawyer.bar_council', 'text', false),
            $f('chamber_address', 'Chamber address', 'lawyer.chamber_address', 'textarea', false),
            $f('advocate_phone', 'Advocate phone', 'lawyer.phone', 'text', false),
        ];

        return [
            [
                'category' => 'wakalatnama', 'title' => 'Wakalatnama', 'title_ur' => 'وکالت نامہ', 'language' => 'en',
                'description' => 'Authority for an advocate to appear and act in a case. Fills from the case, the client and your profile.',
                'fields' => [
                    $f('court_name', 'Court', 'case.court'),
                    $f('case_title', 'Case title', 'case.title'),
                    $f('case_number', 'Case number', 'case.number', 'text', false),
                    $f('client_role', 'Client is the', null, 'text', true, 'Petitioner, plaintiff, defendant, accused, appellant or respondent'),
                    ...$party,
                    ...$advocate,
                    $f('place', 'Place', 'organization.city', 'text', false),
                    $f('date', 'Date', 'today', 'text', false),
                ],
                'body' => <<<'HTML'
<h1 style="text-align: center">WAKALATNAMA</h1>
<p style="text-align: center"><strong>IN THE COURT OF {{form.court_name}}</strong></p>
<p style="text-align: center">{{form.case_title}}</p>
<p style="text-align: center">Case No. {{form.case_number}}</p>
<p>I/We, <strong>{{form.client_name}}</strong>, son/daughter/wife of {{form.client_relation}}, CNIC No. {{form.client_cnic}}, resident of {{form.client_address}}, being the <strong>{{form.client_role}}</strong> in the above case, do hereby appoint and constitute <strong>{{form.advocate_name}}, Advocate</strong>, to appear, plead and act for me/us in the above matter and in all proceedings arising from it, and in particular:</p>
<ol>
<li>to file, sign, verify and receive back plaints, petitions, applications, written statements, appeals, revisions, reviews and all other documents;</li>
<li>to make statements, produce and withdraw documents and evidence, and examine and cross examine witnesses;</li>
<li>to engage or appoint any other advocate to act with or in place of the said advocate;</li>
<li>to withdraw or compromise the case, or refer it to arbitration, only with my/our express consent;</li>
<li>to deposit and withdraw money, receive payments and sign receipts on my/our behalf;</li>
<li>to apply for and obtain certified copies of orders, judgments and documents.</li>
</ol>
<p>I/We agree to ratify all acts done by the said advocate under this authority as if done by me/us. I/We shall remain responsible for my/our attendance on every date of hearing. If the agreed fee is not paid, the advocate shall be at liberty to withdraw from the case.</p>
<p>Signed at {{form.place}} on {{form.date}}.</p>
<p><br></p>
<p>Signature / thumb impression of client: ______________________</p>
<p><br></p>
<p><strong>Accepted</strong></p>
<p>{{form.advocate_name}}, Advocate<br>Enrollment No. {{form.enrollment}}, {{form.bar_council}}<br>{{form.chamber_address}}<br>Phone: {{form.advocate_phone}}</p>
HTML,
            ],
            [
                'category' => 'power-of-attorney', 'title' => 'General Power of Attorney', 'title_ur' => 'عام مختار نامہ', 'language' => 'en',
                'description' => 'Lets the attorney manage the principal’s affairs and property generally. Prepare on stamp paper and get it attested.',
                'fields' => [
                    $f('principal_name', 'Principal (person giving the power)', 'client.name'),
                    $f('principal_relation', 'Principal son, daughter or wife of', null, 'text', false),
                    $f('principal_cnic', 'Principal CNIC', 'client.cnic'),
                    $f('principal_address', 'Principal address', 'client.address', 'textarea'),
                    $f('attorney_name', 'Attorney (person receiving the power)'),
                    $f('attorney_relation', 'Attorney son, daughter or wife of', null, 'text', false),
                    $f('attorney_cnic', 'Attorney CNIC'),
                    $f('attorney_address', 'Attorney address', null, 'textarea'),
                    $f('relationship', 'Relationship to principal', null, 'text', false, 'For example brother or business partner'),
                    $f('property', 'Property or matters covered', null, 'textarea', false, 'Describe the property or leave blank for general affairs'),
                    $f('witness_one', 'First witness (name and CNIC)', null, 'text', false),
                    $f('witness_two', 'Second witness (name and CNIC)', null, 'text', false),
                    $f('place', 'Place', 'organization.city', 'text', false),
                    $f('date', 'Date', 'today', 'text', false),
                ],
                'body' => <<<'HTML'
<h1 style="text-align: center">GENERAL POWER OF ATTORNEY</h1>
<p>KNOW ALL MEN BY THESE PRESENTS that I, <strong>{{form.principal_name}}</strong>, son/daughter/wife of {{form.principal_relation}}, CNIC No. {{form.principal_cnic}}, resident of {{form.principal_address}} (the Principal), do hereby appoint <strong>{{form.attorney_name}}</strong>, son/daughter/wife of {{form.attorney_relation}}, CNIC No. {{form.attorney_cnic}}, resident of {{form.attorney_address}}, my {{form.relationship}} (the Attorney), as my lawful general attorney to act for me and in my name in respect of {{form.property}}, and to do the following acts:</p>
<ol>
<li>to manage, look after and deal with my property and affairs, and to collect rents, profits and dues and give valid receipts;</li>
<li>to sign, execute and present for registration any deed, agreement or document, and to appear before any registrar, sub registrar or revenue authority;</li>
<li>to represent me before any court, tribunal, government department, bank or authority, and to engage advocates for that purpose;</li>
<li>to apply for, obtain and submit any certificate, mutation, record or copy;</li>
<li>to operate accounts and make payments as needed for the above purposes;</li>
<li>generally to do all lawful acts necessary for the above purposes as fully as I could do myself.</li>
</ol>
<p>I hereby ratify and confirm all acts lawfully done by my Attorney under this power, which shall remain in force until revoked by me in writing.</p>
<p>Executed at {{form.place}} on {{form.date}}.</p>
<p><br></p>
<p>PRINCIPAL: ______________________ ({{form.principal_name}})</p>
<p>ATTORNEY (accepted): ______________________ ({{form.attorney_name}})</p>
<p><strong>Witnesses</strong></p>
<p>1. {{form.witness_one}} ______________________</p>
<p>2. {{form.witness_two}} ______________________</p>
<p><em>To be executed on stamp paper of the required value and attested as required by law.</em></p>
HTML,
            ],
            [
                'category' => 'power-of-attorney', 'title' => 'Special Power of Attorney (litigation)', 'title_ur' => 'خصوصی مختار نامہ (مقدمہ بازی)', 'language' => 'en',
                'description' => 'Lets a relative or agent pursue one specific case for the principal, for example a principal living abroad.',
                'fields' => [
                    $f('principal_name', 'Principal', 'client.name'),
                    $f('principal_relation', 'Principal son, daughter or wife of', null, 'text', false),
                    $f('principal_cnic', 'Principal CNIC or passport', 'client.cnic'),
                    $f('principal_address', 'Principal address', 'client.address', 'textarea'),
                    $f('attorney_name', 'Attorney'),
                    $f('attorney_cnic', 'Attorney CNIC'),
                    $f('attorney_address', 'Attorney address', null, 'textarea'),
                    $f('court_name', 'Court', 'case.court'),
                    $f('case_title', 'Case title', 'case.title'),
                    $f('case_number', 'Case number', 'case.number', 'text', false),
                    $f('advocate_name', 'Advocate to be engaged', 'lawyer.name', 'text', false),
                    $f('place', 'Place', 'organization.city', 'text', false),
                    $f('date', 'Date', 'today', 'text', false),
                ],
                'body' => <<<'HTML'
<h1 style="text-align: center">SPECIAL POWER OF ATTORNEY</h1>
<p>I, <strong>{{form.principal_name}}</strong>, son/daughter/wife of {{form.principal_relation}}, CNIC/Passport No. {{form.principal_cnic}}, resident of {{form.principal_address}}, do hereby appoint <strong>{{form.attorney_name}}</strong>, CNIC No. {{form.attorney_cnic}}, resident of {{form.attorney_address}}, as my special attorney for the following case only:</p>
<p style="text-align: center"><strong>{{form.case_title}}</strong><br>Case No. {{form.case_number}}, pending before {{form.court_name}}</p>
<p>My attorney is authorised:</p>
<ol>
<li>to engage {{form.advocate_name}}, Advocate, or any other advocate, and to sign the wakalatnama on my behalf;</li>
<li>to appear in the above case on every date of hearing, give instructions, make statements and produce documents;</li>
<li>to file any application, appeal, revision or review arising from the above case;</li>
<li>to obtain certified copies and receive any money or documents released in the case and sign receipts.</li>
</ol>
<p>This power is limited to the above case and shall remain in force until the case is finally decided or the power is revoked by me in writing. I ratify all acts lawfully done by my attorney under it.</p>
<p>Executed at {{form.place}} on {{form.date}}.</p>
<p><br></p>
<p>PRINCIPAL: ______________________</p>
<p>ATTORNEY (accepted): ______________________</p>
<p><strong>Witnesses</strong>: 1. ______________________ 2. ______________________</p>
<p><em>If signed abroad, attest before the Pakistani embassy or consulate.</em></p>
HTML,
            ],
        ];
    }
}
