import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import config from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId
});
const auth = getAuth(app);
signInAnonymously(auth).then(() => console.log('SUCCESS')).catch(e => console.error('ERROR:', e.code, e.message));
