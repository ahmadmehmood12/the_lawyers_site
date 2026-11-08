<?php

namespace App\Services\Ai;

use App\Models\AiRequest;
use App\Models\LegalCase;
use App\Models\Organization;
use App\Models\Setting;
use App\Models\User;
use Throwable;

/**
 * AI-assisted drafting and summarization (docs/Modules/AI-Assistant.md).
 *  - Off unless a provider key is configured AND the platform setting ai_enabled = 1.
 *  - Personal identifiers are redacted before sending (setting ai_redact_personal_data).
 *  - Output is labelled as unverified and must be reviewed by an advocate.
 *  - The system prompt forbids inventing citations; the UI marks every result unverified.
 *  - Only metadata (feature, tokens, status) is logged — never prompts or outputs.
 */
class LegalAssistant
{
    public const FEATURES = ['draft', 'summarize', 'chronology', 'hearing_summary', 'translate_en_ur', 'translate_ur_en', 'grammar', 'client_update', 'extract', 'research'];

    private const SYSTEM = <<<'TXT'
You assist advocates practising in Pakistan. Your output is a draft for a qualified lawyer to review — never final legal advice.
Rules:
- Never invent case law, citations, judgments, statutes or section numbers. If you mention a legal provision, write it as "[verify: …]" so the lawyer checks it against an official source. If unsure, say so.
- Placeholders such as [PERSON_1], [CNIC_2] stand for redacted details; keep them unchanged.
- Be concise, formal and structured. Use the language requested.
TXT;

    public function __construct(private AiProvider $provider) {}

    public function available(): bool
    {
        return $this->provider->isEnabled() && Setting::get('ai_enabled', '0') === '1';
    }

    /**
     * @param  list<string>  $sensitiveNames
     * @return array{text: string, redacted: bool}
     */
    public function run(User $user, Organization $organization, string $feature, string $input, ?LegalCase $case = null, array $sensitiveNames = []): array
    {
        $redact = Setting::get('ai_redact_personal_data', '1') === '1';
        $redactor = new Redactor;
        $payload = $redact ? $redactor->redact($input, $sensitiveNames) : $input;

        $log = AiRequest::create([
            'user_id' => $user->id, 'organization_id' => $organization->id, 'legal_case_id' => $case?->id,
            'feature' => $feature, 'provider' => $this->provider->name(), 'status' => 'started', 'redacted' => $redact,
        ]);

        try {
            $result = $this->provider->complete(self::SYSTEM, $this->instruction($feature)."\n\n---\n".$payload);
            $log->update(['status' => 'completed', 'model' => $result['model'], 'input_tokens' => $result['input_tokens'], 'output_tokens' => $result['output_tokens']]);

            return ['text' => $redact ? $redactor->restore($result['text']) : $result['text'], 'redacted' => $redact];
        } catch (Throwable $e) {
            $log->update(['status' => 'failed', 'error' => mb_substr($e->getMessage(), 0, 500)]);

            throw $e;
        }
    }

    private function instruction(string $feature): string
    {
        return match ($feature) {
            'draft' => 'Draft the legal document described below in formal English suitable for Pakistani courts. Use clear numbered paragraphs.',
            'summarize' => 'Summarize the following document for an advocate: parties, key facts, relief sought, important dates, and open issues.',
            'chronology' => 'Produce a dated chronology (table: date | event | source) of the events in the text below. Mark uncertain dates.',
            'hearing_summary' => 'Summarize these hearing notes into: what happened, order passed, next date, and actions for the lawyer.',
            'translate_en_ur' => 'Translate the following text from English into formal Urdu. Keep legal terms accurate; keep placeholders unchanged.',
            'translate_ur_en' => 'Translate the following Urdu text into formal English. Keep placeholders unchanged.',
            'grammar' => 'Correct grammar, spelling and clarity of the following legal text without changing its meaning. Return only the corrected text.',
            'client_update' => 'Rewrite the following case progress as a short, plain-language update for the client. No legal strategy or internal notes.',
            'extract' => 'Extract structured data from the text: parties, case number, court, FIR number, police station, sections, dates, amounts. Use a bullet list; write "not found" where absent.',
            'research' => 'Outline the legal issues raised and the kinds of Pakistani statutes or precedents a lawyer should research. Do NOT state specific citations as fact — mark every reference "[verify]".',
            default => 'Assist with the following.',
        };
    }
}
