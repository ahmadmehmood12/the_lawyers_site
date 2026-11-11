<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * User Guide (renamed from Documentation): step by step help with themed screenshots.
 * Copy lives in resources/js/Pages/Public/guide/content.ts; screenshots in public/images/guide/{theme}.
 */
class DocumentationController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Public/UserGuide', [
            'canonical' => route('guide'),
        ]);
    }
}
