<?php

namespace FlatRate\ComposerUi;

/**
 * Deterministic Flarum 1.8 extension ID derivation.
 *
 * Mirrors Flarum\Extension\Extension::nameToId():
 *   vendor/package  →  vendor-{package with leading flarum- / flarum-ext- stripped}
 */
final class ExtensionId
{
    public const COMPOSER_NAME = 'flatrate/flarum-composer-ui';

    public const EXPECTED_ID = 'flatrate-composer-ui';

    public static function fromComposerName(string $composerName): string
    {
        $parts = explode('/', $composerName, 2);
        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            throw new \InvalidArgumentException("Invalid Composer package name: {$composerName}");
        }

        [$vendor, $package] = $parts;
        $package = str_replace(['flarum-ext-', 'flarum-'], '', $package);

        return $vendor . '-' . $package;
    }

    /**
     * Read composer.json name and derive the Flarum extension ID.
     */
    public static function fromComposerJsonFile(string $path): string
    {
        if (!is_file($path)) {
            throw new \InvalidArgumentException("composer.json not found: {$path}");
        }

        $data = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $name = $data['name'] ?? null;
        if (!is_string($name) || $name === '') {
            throw new \InvalidArgumentException('composer.json missing name');
        }

        return self::fromComposerName($name);
    }
}
