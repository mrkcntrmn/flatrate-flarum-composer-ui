import app from 'flarum/forum/app';
import extendComposer from './extendComposer';

app.initializers.add('flatrate-composer-ui', () => {
  extendComposer();
});
