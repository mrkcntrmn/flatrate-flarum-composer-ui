<?php

namespace FlatRate\ComposerUi;

/**
 * Presentation-only member cutover gate.
 *
 * Does not grant posting, upload, tagging, polling, or moderation permissions.
 */
final class MemberCutover
{
    public const SETTING_KEY = 'flatrate-composer-ui.member_cutover';

    /**
     * Parse the persisted setting. Fail closed on missing, empty, "0", and
     * malformed values. Only Flarum's canonical boolean true ("1") enables
     * public cutover.
     */
    public static function parse(mixed $raw): bool
    {
        if ($raw === true || $raw === 1) {
            return true;
        }

        if ($raw === null || $raw === false || $raw === 0 || $raw === '') {
            return false;
        }

        if (!is_string($raw)) {
            return false;
        }

        return $raw === '1';
    }

    /**
     * Administrators always receive the custom presentation when the extension
     * is enabled. Other actors require an explicit member_cutover = true.
     */
    public static function presentationEnabled(bool $isAdmin, mixed $rawSetting): bool
    {
        return $isAdmin || self::parse($rawSetting);
    }
}
