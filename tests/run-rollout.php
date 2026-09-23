<?php

/**
 * Minimal backend test runner for environments where PHPUnit extensions are unavailable.
 * Mirrors MemberCutoverTest assertions. Exit 0 on success.
 */

declare(strict_types=1);

$root = dirname(__DIR__);
require $root . '/src/MemberCutover.php';

use FlatRate\ComposerUi\MemberCutover;

$failures = 0;

function expect_same(mixed $expected, mixed $actual, string $label): void
{
    global $failures;
    if ($expected !== $actual) {
        fwrite(STDERR, "FAIL {$label}: expected " . var_export($expected, true) . ' got ' . var_export($actual, true) . "\n");
        $failures++;
        return;
    }
    echo "ok {$label}\n";
}

function expect_true(bool $cond, string $label): void
{
    expect_same(true, $cond, $label);
}

function expect_false(bool $cond, string $label): void
{
    expect_same(false, $cond, $label);
}

$matrix = [
    // admin × setting
    [true, null, true, 'admin missing'],
    [true, '0', true, 'admin false'],
    [true, false, true, 'admin bool false'],
    [true, 'true', true, 'admin malformed true-string'],
    [true, 'yes', true, 'admin malformed yes'],
    [true, '', true, 'admin malformed empty'],
    [true, '1', true, 'admin true'],
    [true, true, true, 'admin bool true'],
    // moderator / member / guest share non-admin path
    [false, null, false, 'non-admin missing'],
    [false, '0', false, 'non-admin false'],
    [false, false, false, 'non-admin bool false'],
    [false, 'true', false, 'non-admin malformed true-string'],
    [false, 'yes', false, 'non-admin malformed yes'],
    [false, 'on', false, 'non-admin malformed on'],
    [false, '', false, 'non-admin malformed empty'],
    [false, ['1'], false, 'non-admin malformed array'],
    [false, '1', true, 'non-admin true'],
    [false, true, true, 'non-admin bool true'],
    [false, 'TRUE', false, 'guest malformed TRUE'],
];

foreach ($matrix as [$isAdmin, $setting, $expected, $label]) {
    expect_same($expected, MemberCutover::presentationEnabled($isAdmin, $setting), $label);
}

expect_false(MemberCutover::parse(null), 'parse null');
expect_false(MemberCutover::parse(''), 'parse empty');
expect_false(MemberCutover::parse('0'), 'parse 0');
expect_false(MemberCutover::parse('true'), 'parse true-string');
expect_false(MemberCutover::parse('yes'), 'parse yes');
expect_true(MemberCutover::parse('1'), 'parse 1');
expect_true(MemberCutover::parse(true), 'parse bool true');
expect_true(MemberCutover::parse(1), 'parse int 1');

expect_same('flatrate-composer-ui.member_cutover', MemberCutover::SETTING_KEY, 'setting key');

require $root . '/src/ExtensionId.php';

$derivedId = \FlatRate\ComposerUi\ExtensionId::fromComposerJsonFile($root . '/composer.json');
expect_same(\FlatRate\ComposerUi\ExtensionId::EXPECTED_ID, $derivedId, 'derived extension id');
expect_same(
    \FlatRate\ComposerUi\ExtensionId::fromComposerName(\FlatRate\ComposerUi\ExtensionId::COMPOSER_NAME),
    $derivedId,
    'composer name maps to expected id'
);
$extend = (string) file_get_contents($root . '/extend.php');
$attribute = (string) file_get_contents($root . '/src/Api/FlatrateComposerUiEnabledAttribute.php');
$adminJs = (string) file_get_contents($root . '/js/src/admin/index.js');
$forumIndex = (string) file_get_contents($root . '/js/src/forum/index.js');
$forumExtend = (string) file_get_contents($root . '/js/src/forum/extendComposer.js');
$adminDist = (string) file_get_contents($root . '/js/dist/admin.js');

expect_true(str_contains($extend, 'FlatrateComposerUiEnabledAttribute::class'), 'extend registers attribute');
expect_true(str_contains($extend, "->default(MemberCutover::SETTING_KEY, '0')"), 'extend default off');
expect_true(str_contains($extend, "->js(__DIR__.'/js/dist/admin.js')"), 'extend admin js');
expect_true(str_contains($attribute, "'flatrateComposerUiEnabled' => \$enabled"), 'attribute key');
expect_true(str_contains($attribute, 'getActor()->isAdmin()'), 'uses isAdmin');
expect_false(str_contains($attribute, 'can('), 'attribute avoids can()');
expect_true(str_contains($adminJs, "setting: 'flatrate-composer-ui.member_cutover'"), 'admin setting key');
expect_true(str_contains($adminJs, "for('{$derivedId}')"), 'admin extension id source');
expect_false(str_contains($adminJs, "for('flatrate-flarum-composer-ui')"), 'admin source rejects wrong id');
expect_true(str_contains($adminDist, "for(\"{$derivedId}\")") || str_contains($adminDist, "for('{$derivedId}')") || str_contains($adminDist, "for(\"flatrate-composer-ui\")"), 'admin bundle extension id');
expect_false(str_contains($adminDist, 'flatrate-flarum-composer-ui'), 'admin bundle rejects wrong id');
// Flarum boots initializers before app.forum exists — gate at decorate/lifecycle time.
expect_true(str_contains($forumIndex, 'extendComposer()'), 'forum always registers decorators');
expect_false(str_contains($forumIndex, 'shouldInstallComposerPresentation(app.forum)'), 'forum index has no init-time gate');
expect_true(str_contains($forumExtend, 'shouldInstallComposerPresentation(app.forum)'), 'forum decorate-time gate');
expect_true(str_contains($forumExtend, "extend(Composer.prototype, 'oncreate'"), 'composer oncreate gated');

$src = (string) file_get_contents($root . '/src/MemberCutover.php');
expect_false(str_contains($src, '->can('), 'helper avoids can()');
expect_true(str_contains($src, 'Does not grant posting'), 'presentation-only note');

if ($failures > 0) {
    fwrite(STDERR, "\n{$failures} failure(s)\n");
    exit(1);
}

echo "\nAll backend rollout assertions passed.\n";
exit(0);
