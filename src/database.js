const { Low, JSONFile } = require('lowdb');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.resolve(process.env.DB_PATH || './data/upsc_notes.db.json');

// Create a new lowdb instance
const adapter = new JSONFile(DB_PATH);
const db = new Low(adapter);

async function initDatabase() {
  await db.read();

  // Set default structure if DB is empty
  db.data ||= {
    admin: null,
    private_sections: [
      { id: 'photos', name: 'Photos', description: 'A private photo gallery', icon: 'camera', enabled: true, order: 1 },
      { id: 'letters', name: 'Messages', description: 'Private digital messages', icon: 'mail', enabled: true, order: 2 },
      { id: 'moments', name: 'Documents', description: 'Meaningful memories and documents', icon: 'heart', enabled: true, order: 3 },
      { id: 'diary', name: 'Articles', description: 'Private articles & entries', icon: 'book', enabled: true, order: 4 },
    ],
    photos: [],
    albums: [
      { id: 'default', name: 'All Photos', description: 'Default album', created_at: new Date().toISOString() }
    ],
    letters: [],
    diary_entries: [],
    moments: [],
    anniversary: {
      day: parseInt(process.env.ANNIVERSARY_DAY || '30'),
      month: parseInt(process.env.ANNIVERSARY_MONTH || '0'),
      year: parseInt(process.env.ANNIVERSARY_YEAR || '0'),
      message: '',
      configured: false,
    },
    upsc_content: {
      announcements: [],
      current_affairs: [],
      mock_questions: [
        {
          id: uuidv4(),
          question: 'Which article of the Indian Constitution deals with the Right to Equality?',
          options: ['Article 12', 'Article 14', 'Article 19', 'Article 21'],
          correct: 1,
          explanation: 'Article 14 of the Indian Constitution guarantees the Right to Equality before law and equal protection of laws to all persons within the territory of India.',
          subject: 'Polity',
          difficulty: 'Easy'
        },
        {
          id: uuidv4(),
          question: 'The Directive Principles of State Policy are contained in which Part of the Indian Constitution?',
          options: ['Part III', 'Part IV', 'Part IVA', 'Part V'],
          correct: 1,
          explanation: 'The Directive Principles of State Policy (DPSP) are contained in Part IV of the Indian Constitution (Articles 36-51).',
          subject: 'Polity',
          difficulty: 'Easy'
        },
        {
          id: uuidv4(),
          question: 'Which of the following is the highest peak in the Eastern Ghats?',
          options: ['Jindhagada Peak', 'Mahendragiri', 'Deomali', 'Arma Konda'],
          correct: 3,
          explanation: 'Arma Konda (also called Ammagonda) at 1680m in Andhra Pradesh is the highest peak in the Eastern Ghats.',
          subject: 'Geography',
          difficulty: 'Medium'
        },
        {
          id: uuidv4(),
          question: 'Who wrote "The Discovery of India"?',
          options: ['Mahatma Gandhi', 'B.R. Ambedkar', 'Jawaharlal Nehru', 'Subhash Chandra Bose'],
          correct: 2,
          explanation: '"The Discovery of India" was written by India\'s first Prime Minister Jawaharlal Nehru while he was imprisoned at Ahmednagar Fort during 1942-1946.',
          subject: 'History',
          difficulty: 'Easy'
        },
        {
          id: uuidv4(),
          question: 'Which Five-Year Plan in India was based on the Mahalanobis model?',
          options: ['First Five-Year Plan', 'Second Five-Year Plan', 'Third Five-Year Plan', 'Fourth Five-Year Plan'],
          correct: 1,
          explanation: 'The Second Five-Year Plan (1956-1961) was based on the Mahalanobis model which emphasized rapid industrialization with focus on heavy industries.',
          subject: 'Economy',
          difficulty: 'Medium'
        },
      ]
    }
  };

  // Replace the starter's known demo account once with owner-supplied credentials.
  if (!db.data.admin || !db.data.admin.credentials_configured) {
    if (!process.env.ADMIN_PASSWORD_HASH || !process.env.ADMIN_USERNAME) {
      throw new Error('Run npm run setup to configure the administrator account.');
    }
    db.data.admin = {
      username: process.env.ADMIN_USERNAME,
      password_hash: process.env.ADMIN_PASSWORD_HASH,
      credentials_configured: true,
      created_at: new Date().toISOString(),
    };
  }
  await db.write();
  console.log('✅ Database initialized');
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb };


