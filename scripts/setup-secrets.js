const { createInterface } = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
(async () => {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const replace = (await rl.question('A .env file already exists. Replace its credentials? (y/N) ')).trim().toLowerCase();
      if (replace !== 'y') { console.log('Setup cancelled.'); return; }
    }
    const username = (await rl.question('Administrator username: ')).trim();
    const password = await rl.question('Administrator password (at least 12 characters): ');
    if (!username || password.length < 12) throw new Error('Enter a username and a password of at least 12 characters.');
    const prompts = ['Answer to “I ask her 33”', 'Answer to “I ask her 18”', 'Answer to “Keyword 1”', 'Answer to “Keyword 2”', 'Answer to “Lab number”'];
    const answers = [];
    for (const prompt of prompts) {
      const answer = await rl.question(`${prompt}: `);
      if (!answer.trim()) throw new Error('All five challenge answers are required.');
      answers.push(answer.trim().toLowerCase());
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const hashes = await Promise.all(answers.map((answer) => bcrypt.hash(answer, 12)));
    const lines = ['NODE_ENV=development', 'PORT=5000', 'FRONTEND_URL=http://localhost:5173', `SESSION_SECRET=${randomBytes(48).toString('hex')}`, `ADMIN_USERNAME=${username}`, `ADMIN_PASSWORD_HASH=${passwordHash}`, ...hashes.map((hash, i) => `CHALLENGE_${i + 1}_HASH=${hash}`), 'DB_PATH=./data/upsc_notes.db.json', 'UPLOADS_DIR=./private_uploads'];
    fs.writeFileSync(envPath, `${lines.join('\n')}\n`, { mode: 0o600 });
    console.log(`Secure local configuration saved to ${envPath}`);
  } finally { rl.close(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
