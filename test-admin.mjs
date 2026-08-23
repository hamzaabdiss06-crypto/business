import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp();
getAuth().setCustomUserClaims('testuid', { role: 'platform_admin' })
  .then(() => console.log('SUCCESS'))
  .catch(e => console.error('ERROR:', e.message));
