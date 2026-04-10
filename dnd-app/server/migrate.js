// server/migrate.js — Run manually: node server/migrate.js
// Use this to create tables in your Neon database before the first deploy.
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { migrate, pool } = require('./db');

(async () => {
  try {
    console.log('🔄 Conectando ao banco de dados…');
    await migrate();
    console.log('🎉 Banco pronto!');
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
