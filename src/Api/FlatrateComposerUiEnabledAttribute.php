<?php

namespace FlatRate\ComposerUi\Api;

use FlatRate\ComposerUi\MemberCutover;
use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Actor-resolved presentation flag for the mobile composer shell.
 *
 * Returns a real JSON boolean. Does not expose privileged data and must not
 * be treated as an authorization check.
 */
class FlatrateComposerUiEnabledAttribute
{
    public function __construct(
        private SettingsRepositoryInterface $settings
    ) {
    }

    /**
     * @return array{flatrateComposerUiEnabled: bool}
     */
    public function __invoke(ForumSerializer $serializer): array
    {
        $raw = $this->settings->get(MemberCutover::SETTING_KEY);
        $enabled = MemberCutover::presentationEnabled(
            $serializer->getActor()->isAdmin(),
            $raw
        );

        return [
            'flatrateComposerUiEnabled' => $enabled,
        ];
    }
}
