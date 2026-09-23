<?php

/*
 * Schema-free presentation extension. No migrations.
 */

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Extend;
use FlatRate\ComposerUi\Api\FlatrateComposerUiEnabledAttribute;
use FlatRate\ComposerUi\MemberCutover;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/resources/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Settings())
        ->default(MemberCutover::SETTING_KEY, '0'),

    (new Extend\ApiSerializer(ForumSerializer::class))
        ->attributes(FlatrateComposerUiEnabledAttribute::class),
];
