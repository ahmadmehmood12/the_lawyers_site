<?php

namespace App\Notifications;

use App\Enums\ArticleStatus;
use App\Models\Article;

/** Tells the author that their article was published or sent back (Admin, Moderation). */
class ArticleModerated extends PlatformNotification
{
    public function __construct(public Article $article) {}

    public function event(): string
    {
        return 'article_update';
    }

    public function mailTemplateKey(): string
    {
        return $this->published() ? 'article_published' : 'article_rejected';
    }

    private function published(): bool
    {
        return $this->article->status === ArticleStatus::Published;
    }

    /** @return array{title: string, body: string, url: string, icon: string} */
    public function content(object $notifiable): array
    {
        return $this->published()
            ? [
                'title' => __('Your article is live: :title', ['title' => $this->article->title]),
                'body' => __('Our team approved your article. It now appears in the legal library with your name.'),
                'url' => route('articles.show', $this->article->slug),
                'icon' => 'newspaper',
            ]
            : [
                'title' => __('Changes needed for your article: :title', ['title' => $this->article->title]),
                'body' => __('Our team could not publish your article yet. Reason: :reason', ['reason' => $this->article->rejection_reason ?: __('Not given')]),
                'url' => route('lawyer.articles.edit', $this->article->id),
                'icon' => 'newspaper',
            ];
    }

    public function mailData(object $notifiable): array
    {
        $content = $this->content($notifiable);

        return [
            'subject' => $content['title'], 'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [$content['body']],
            'details' => [__('Article') => $this->article->title, __('Category') => $this->article->category?->name],
            'notice' => $this->published() ? null : __('Edit the article and press Submit for review again. It keeps all your text.'),
            'action_label' => $this->published() ? __('Read it live') : __('Edit the article'),
            'action_url' => $content['url'],
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        return ['title' => $this->article->title, 'reason' => $this->article->rejection_reason];
    }
}
