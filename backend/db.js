const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db = null;

async function getDb() {
  if (db) return db;

  const dbPath = path.join(__dirname, '..', 'highway.sqlite');

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      road_type TEXT DEFAULT 'Local',
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      original_image_url TEXT,
      assigned_to INTEGER,
      assigned_at DATETIME,
      due_by DATETIME,
      ai_closure_notes TEXT,
      closing_image_url TEXT,
      closing_video_url TEXT,
      resolution_lat REAL,
      resolution_lng REAL,
      closed_at DATETIME,
      FOREIGN KEY(assigned_to) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employee_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      road_type TEXT NOT NULL,
      FOREIGN KEY(employee_id) REFERENCES users(id)
    );
  `);

  // Define new columns explicitly to alter existing dev databases safely
  const cols = [
    { name: 'assigned_to', type: 'INTEGER' },
    { name: 'assigned_at', type: 'DATETIME' },
    { name: 'due_by', type: 'DATETIME' },
    { name: 'closing_video_url', type: 'TEXT' },
    { name: 'resolution_lat', type: 'REAL' },
    { name: 'resolution_lng', type: 'REAL' },
    { name: 'closed_at', type: 'DATETIME' },
    { name: 'road_type', type: 'TEXT DEFAULT "Local"' },
    { name: 'original_image_url', type: 'TEXT' }
  ];

  for (const col of cols) {
    try {
      await db.exec(`ALTER TABLE complaints ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // Column might already exist, safely ignore
    }
  }

  // Seed users and assignments if not exists
  const adminExists = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    await db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin', 'admin', 'ADMIN']);
  }

  // Pre-seed employees for different road types
  const employees = [
    { username: 'employee_local', password: 'password', road: 'Local' },
    { username: 'employee_state', password: 'password', road: 'State' },
    { username: 'employee_national', password: 'password', road: 'National' }
  ];

  for (const emp of employees) {
    let empRecord = await db.get('SELECT id FROM users WHERE username = ?', [emp.username]);
    if (!empRecord) {
      const result = await db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [emp.username, emp.password, 'EMPLOYEE']);
      empRecord = { id: result.lastID };
    }
    
    // Check if assignment exists
    const assignmentExists = await db.get('SELECT id FROM employee_assignments WHERE employee_id = ? AND road_type = ?', [empRecord.id, emp.road]);
    if (!assignmentExists) {
       await db.run('INSERT INTO employee_assignments (employee_id, road_type) VALUES (?, ?)', [empRecord.id, emp.road]);
    }
  }

  return db;
}

module.exports = { getDb };
