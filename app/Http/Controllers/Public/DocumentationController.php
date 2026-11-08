<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Bilingual (English/Urdu) product documentation for advocates and law firms.
 * The copy lives in the page component so both languages ship together and the
 * global language switcher changes the reading direction and text.
 */
class DocumentationController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Public/Documentation', [
            'canonical' => route('documentation'),
        ]);
    }
}
