import app from 'flarum/forum/app';
import extendComposer from './extendComposer';
import { shouldInstallComposerPresentation } from './rolloutGate';

app.initializers.add('flatrate-composer-ui', () => {
  // Fail closed: only the server-authoritative JSON boolean true installs
  // decorators. Gated actors retain the untouched native composer — no CSS hide.
  if (!shouldInstallComposerPresentation(app.forum)) {
    return;
  }

  extendComposer();
});
