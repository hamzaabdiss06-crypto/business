const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp();
getAuth().setCustomUserClaims('testuid', { role: 'platform_admin' })
  .then(() => console.log('SUCCESS'))
  .catch(e => console.error('ERROR:', e.message));
