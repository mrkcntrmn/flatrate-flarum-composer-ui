import app from 'flarum/forum/app';
import extendComposer from './extendComposer';

app.initializers.add('flatrate-composer-ui', () => {
  // Always register decorators. Flarum runs initializers before app.forum exists
  // (Application.boot pushes the payload after initializers), so an init-time
  // attribute gate can never observe flatrateComposerUiEnabled. Fail-closed
  // rollout is enforced at decoration time via shouldInstallComposerPresentation.
  extendComposer();
});
