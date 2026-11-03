const { PRIVATE_CHALLENGES } = require('./middleware/auth');
function validateSecrets() {
  const required = ['SESSION_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH', ...PRIVATE_CHALLENGES.map((_, index) => `CHALLENGE_${index + 1}_HASH`)];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required configuration: ${missing.join(', ')}. Copy .env.example to .env and run npm run setup.`);
  if (process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  for (const key of ['ADMIN_PASSWORD_HASH', ...PRIVATE_CHALLENGES.map((_, index) => `CHALLENGE_${index + 1}_HASH`)]) {
    if (!/^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/.test(process.env[key])) throw new Error(`${key} must be a bcrypt hash. Run npm run setup.`);
  }
}
module.exports = { validateSecrets };

