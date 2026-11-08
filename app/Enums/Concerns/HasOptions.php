<?php

namespace App\Enums\Concerns;

/**
 * Shared helpers for backed enums: translated labels and select options.
 * Labels live in lang/{locale}/enums.php under the enum's translation group.
 */
trait HasOptions
{
    abstract public static function translationGroup(): string;

    public function label(): string
    {
        return __('enums.'.static::translationGroup().'.'.$this->value);
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
