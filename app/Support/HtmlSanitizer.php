<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Allow-list HTML sanitizer for rich text (drafts, articles, templates).
 * Strips scripts, event handlers, styles (except text-align on blocks) and non-http(s) URLs.
 */
class HtmlSanitizer
{
    /** @var array<string, list<string>> tag => allowed attributes */
    private const ALLOWED = [
        'p' => ['class', 'style'], 'br' => [], 'strong' => [], 'b' => [], 'em' => [], 'i' => [], 'u' => [], 's' => [],
        'h1' => ['style'], 'h2' => ['style'], 'h3' => ['style'], 'h4' => ['style'], 'blockquote' => [], 'ol' => [], 'ul' => [], 'li' => [],
        'table' => [], 'thead' => [], 'tbody' => [], 'tr' => [], 'th' => ['colspan', 'rowspan', 'style'], 'td' => ['colspan', 'rowspan', 'style'],
        'a' => ['href'], 'span' => ['class', 'data-placeholder'], 'div' => ['class'], 'hr' => [], 'sup' => [], 'sub' => [],
    ];

    /** @var list<string> */
    private const CLASSES = ['page-break', 'placeholder', 'text-center', 'text-right', 'text-left', 'signature'];

    public static function clean(?string $html): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        $dom = new DOMDocument;
        libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="utf-8"?><div id="__root">'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET);
        libxml_clear_errors();

        $root = $dom->getElementById('__root');
        if (! $root) {
            return '';
        }

        self::walk($root);

        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $dom->saveHTML($child);
        }

        return $out;
    }

    private static function walk(DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMElement) {
                $tag = strtolower($child->tagName);

                if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'svg', 'math', 'template'], true)) {
                    $child->parentNode?->removeChild($child);

                    continue;
                }

                if (! array_key_exists($tag, self::ALLOWED)) {
                    self::walk($child);
                    while ($child->firstChild) {
                        $child->parentNode?->insertBefore($child->firstChild, $child);
                    }
                    $child->parentNode?->removeChild($child);

                    continue;
                }

                foreach (iterator_to_array($child->attributes) as $attribute) {
                    $name = strtolower($attribute->name);
                    $keep = in_array($name, self::ALLOWED[$tag], true);

                    if ($keep && $name === 'href' && ! preg_match('#^(https?://|mailto:|/|\#)#i', trim($attribute->value))) {
                        $keep = false;
                    }

                    // Only text alignment survives from inline styles (the editor's align buttons; mPDF honours it).
                    if ($keep && $name === 'style') {
                        if (preg_match('/text-align\s*:\s*(left|right|center|justify)/i', $attribute->value, $align)) {
                            $attribute->value = 'text-align: '.strtolower($align[1]);
                        } else {
                            $keep = false;
                        }
                    }

                    if ($keep && $name === 'class') {
                        $attribute->value = implode(' ', array_intersect(explode(' ', $attribute->value), self::CLASSES));
                    }

                    if (! $keep) {
                        $child->removeAttribute($attribute->name);
                    }
                }

                if ($tag === 'a') {
                    $child->setAttribute('rel', 'nofollow noopener noreferrer');
                }

                self::walk($child);
            }
        }
    }
}
