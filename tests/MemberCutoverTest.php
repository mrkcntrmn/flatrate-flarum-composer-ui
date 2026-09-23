<?php

namespace FlatRate\ComposerUi\Tests;

use FlatRate\ComposerUi\MemberCutover;
use PHPUnit\Framework\TestCase;

class MemberCutoverTest extends TestCase
{
    /**
     * @dataProvider actorMatrixProvider
     */
    public function testActorMatrix(bool $isAdmin, mixed $setting, bool $expected): void
    {
        $this->assertSame(
            $expected,
            MemberCutover::presentationEnabled($isAdmin, $setting)
        );
    }

    public function actorMatrixProvider(): array
    {
        // Columns: missing | false/"0" | malformed | true/"1"
        return [
            'admin missing' => [true, null, true],
            'admin false' => [true, '0', true],
            'admin bool false' => [true, false, true],
            'admin malformed true-string' => [true, 'true', true],
            'admin malformed yes' => [true, 'yes', true],
            'admin malformed empty' => [true, '', true],
            'admin true' => [true, '1', true],
            'admin bool true' => [true, true, true],

            'moderator missing' => [false, null, false],
            'moderator false' => [false, '0', false],
            'moderator bool false' => [false, false, false],
            'moderator malformed true-string' => [false, 'true', false],
            'moderator malformed yes' => [false, 'yes', false],
            'moderator malformed on' => [false, 'on', false],
            'moderator malformed empty' => [false, '', false],
            'moderator malformed array' => [false, ['1'], false],
            'moderator true' => [false, '1', true],
            'moderator bool true' => [false, true, true],

            // Member and guest share the non-admin path.
            'member missing' => [false, null, false],
            'member false' => [false, '0', false],
            'member malformed' => [false, 'true', false],
            'member true' => [false, '1', true],
            'guest missing' => [false, null, false],
            'guest false' => [false, '0', false],
            'guest malformed' => [false, 'TRUE', false],
            'guest true' => [false, '1', true],
        ];
    }

    public function testParseFailClosed(): void
    {
        $this->assertFalse(MemberCutover::parse(null));
        $this->assertFalse(MemberCutover::parse(''));
        $this->assertFalse(MemberCutover::parse('0'));
        $this->assertFalse(MemberCutover::parse('true'));
        $this->assertFalse(MemberCutover::parse('yes'));
        $this->assertFalse(MemberCutover::parse('on'));
        $this->assertFalse(MemberCutover::parse('TRUE'));
        $this->assertTrue(MemberCutover::parse('1'));
        $this->assertTrue(MemberCutover::parse(true));
        $this->assertTrue(MemberCutover::parse(1));
    }

    public function testSettingKeyAndAttributeContract(): void
    {
        $this->assertSame('flatrate-composer-ui.member_cutover', MemberCutover::SETTING_KEY);

        $root = dirname(__DIR__);
        $extend = (string) file_get_contents($root . '/extend.php');
        $attribute = (string) file_get_contents($root . '/src/Api/FlatrateComposerUiEnabledAttribute.php');
        $adminJs = (string) file_get_contents($root . '/js/src/admin/index.js');
        $forumIndex = (string) file_get_contents($root . '/js/src/forum/index.js');

        $derivedId = \FlatRate\ComposerUi\ExtensionId::fromComposerJsonFile($root . '/composer.json');
        $this->assertSame(\FlatRate\ComposerUi\ExtensionId::EXPECTED_ID, $derivedId);
        $this->assertSame(
            \FlatRate\ComposerUi\ExtensionId::fromComposerName(\FlatRate\ComposerUi\ExtensionId::COMPOSER_NAME),
            $derivedId
        );
        $this->assertStringContainsString("for('{$derivedId}')", $adminJs);
        $this->assertStringNotContainsString("for('flatrate-flarum-composer-ui')", $adminJs);

        $this->assertStringContainsString('FlatrateComposerUiEnabledAttribute::class', $extend);
        $this->assertStringContainsString("->default(MemberCutover::SETTING_KEY, '0')", $extend);
        $this->assertStringContainsString("->js(__DIR__.'/js/dist/admin.js')", $extend);
        $this->assertStringContainsString("'flatrateComposerUiEnabled' => \$enabled", $attribute);
        $this->assertStringContainsString('getActor()->isAdmin()', $attribute);
        $this->assertStringNotContainsString('can(', $attribute);
        $this->assertStringContainsString("setting: 'flatrate-composer-ui.member_cutover'", $adminJs);
        // Initials run before app.forum exists — gate at decorate/lifecycle time.
        $this->assertStringContainsString('extendComposer()', $forumIndex);
        $this->assertStringNotContainsString('shouldInstallComposerPresentation(app.forum)', $forumIndex);
        $forumExtend = (string) file_get_contents($root . '/js/src/forum/extendComposer.js');
        $this->assertStringContainsString('shouldInstallComposerPresentation(app.forum)', $forumExtend);
        $this->assertStringContainsString("extend(Composer.prototype, 'oncreate'", $forumExtend);
    }

    public function testPresentationGateDoesNotMentionPermissionApis(): void
    {
        $src = (string) file_get_contents(dirname(__DIR__) . '/src/MemberCutover.php');
        $this->assertStringNotContainsString('->can(', $src);
        $this->assertStringNotContainsString('Permission', $src);
        $this->assertStringContainsString('Does not grant posting', $src);
    }
}
