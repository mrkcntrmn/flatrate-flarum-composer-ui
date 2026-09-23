import app from 'flarum/admin/app';

app.initializers.add('flatrate-composer-ui', () => {
  // Flarum ID for flatrate/flarum-composer-ui is flatrate-composer-ui
  // (package name with leading "flarum-" stripped).
  app.extensionData.for('flatrate-composer-ui').registerSetting({
    setting: 'flatrate-composer-ui.member_cutover',
    type: 'boolean',
    label: app.translator.trans('flatrate-composer-ui.admin.settings.member_cutover_label'),
    help: app.translator.trans('flatrate-composer-ui.admin.settings.member_cutover_help'),
  });
});
