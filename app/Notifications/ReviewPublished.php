<?php

namespace App\Notifications;

use App\Models\Review;

/** A client's review was approved and now shows on the lawyer's public profile. */
class ReviewPublished extends PlatformNotification
{
    public function __construct(public Review $review) {}

    public function event(): string
    {
        return 'review';
    }

    /** @return array{title: string, body: string, url: string, icon: string} */
    public function content(object $notifiable): array
    {
        return [
            'title' => __('New :rating star review on your profile', ['rating' => $this->review->rating]),
            'body' => __(':name reviewed you: “:text”', ['name' => $this->review->author?->name ?? __('A client'), 'text' => str($this->review->title ?: $this->review->comment)->limit(140)->toString()]),
            'url' => route('lawyer.articles.index'),
            'icon' => 'star',
        ];
    }

    public function mailData(object $notifiable): array
    {
        $content = $this->content($notifiable);

        return [
            'subject' => $content['title'], 'heading' => $content['title'],
            'greeting' => __('Dear :name,', ['name' => $this->recipientName($notifiable)]),
            'intro' => [__('A client review was approved and is now on your public profile.')],
            'details' => [
                __('Rating') => str_repeat('★', (int) $this->review->rating).str_repeat('☆', 5 - (int) $this->review->rating),
                __('From') => $this->review->author?->name,
                __('Title') => $this->review->title,
                __('Review') => str($this->review->comment)->limit(400)->toString(),
            ],
            'notice' => __('A short, polite public reply builds trust with future clients.'),
            'action_label' => __('Reply to the review'), 'action_url' => $content['url'],
        ];
    }

    public function mailReplacements(object $notifiable): array
    {
        return ['rating' => $this->review->rating, 'client' => $this->review->author?->name];
    }
}
