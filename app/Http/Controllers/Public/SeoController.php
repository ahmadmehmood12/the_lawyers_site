<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\LawyerProfile;
use App\Models\Organization;
use App\Models\Page;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/** sitemap.xml and robots.txt. Private areas are disallowed and never listed. */
class SeoController extends Controller
{
    public function sitemap(): Response
    {
        $xml = Cache::remember('sitemap.xml', now()->addHour(), function (): string {
            $urls = collect([route('home'), route('lawyers.index'), route('firms.index'), route('specializations.index'), route('articles.index'), route('pricing'), route('contact')])
                ->map(fn ($u) => ['loc' => $u, 'lastmod' => null]);
            $urls = $urls
                ->merge(Page::query()->where('is_published', true)->get(['slug', 'updated_at'])->map(fn ($p) => ['loc' => url($p->slug), 'lastmod' => $p->updated_at]))
                ->merge(LawyerProfile::query()->listed()->get(['slug', 'updated_at'])->map(fn ($p) => ['loc' => route('lawyers.show', $p->slug), 'lastmod' => $p->updated_at]))
                ->merge(Organization::query()->where('type', 'firm')->where('is_public', true)->get(['slug', 'updated_at'])->map(fn ($o) => ['loc' => route('firms.show', $o->slug), 'lastmod' => $o->updated_at]))
                ->merge(Article::query()->published()->get(['slug', 'updated_at'])->map(fn ($a) => ['loc' => route('articles.show', $a->slug), 'lastmod' => $a->updated_at]));

            $body = $urls->map(fn ($u) => '<url><loc>'.e($u['loc']).'</loc>'.($u['lastmod'] ? '<lastmod>'.$u['lastmod']->toAtomString().'</lastmod>' : '').'</url>')->implode('');

            return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'.$body.'</urlset>';
        });

        return response($xml, 200, ['Content-Type' => 'application/xml']);
    }

    public function robots(): Response
    {
        $lines = [
            'User-agent: *',
            'Disallow: /dashboard', 'Disallow: /cases', 'Disallow: /clients', 'Disallow: /diary', 'Disallow: /documents', 'Disallow: /drafts',
            'Disallow: /invoices', 'Disallow: /messages', 'Disallow: /portal', 'Disallow: /admin', 'Disallow: /account', 'Disallow: /settings',
            'Disallow: /tasks', 'Disallow: /appointments', 'Disallow: /notifications', 'Disallow: /team', 'Disallow: /analytics', 'Disallow: /ai',
            'Sitemap: '.route('sitemap'),
        ];

        return response(implode("\n", $lines)."\n", 200, ['Content-Type' => 'text/plain']);
    }
}
