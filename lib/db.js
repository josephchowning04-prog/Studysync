const { randomUUID } = require('node:crypto');

async function openDatabase({ url = process.env.DATABASE_URL, file = process.env.SQLITE_PATH || 'studysync.sqlite' } = {}) {
  let query;
  let close;

  if (url) {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
    pool.on('error', () => console.error('An idle database connection was lost.'));
    query = async (sql, values = []) => {
      let position = 0;
      return (await pool.query(sql.replace(/\?/g, () => '$' + ++position), values)).rows;
    };
    close = () => pool.end();
  } else {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(file);
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    query = async (sql, values = []) => db.prepare(sql).all(...values);
    close = () => db.close();
  }

  try {
    await query('CREATE TABLE IF NOT EXISTS study_sets (id TEXT PRIMARY KEY, title TEXT NOT NULL, notes TEXT NOT NULL, updated_at TEXT NOT NULL)');
    await query(`CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY, set_id TEXT NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
      mode TEXT NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL,
      missed TEXT NOT NULL, created_at TEXT NOT NULL
    )`);
  } catch (error) {
    await close();
    throw error;
  }

  return {
    close,
    async list(search) {
      return query("SELECT id, title, updated_at FROM study_sets WHERE lower(title) LIKE ? ESCAPE '!' ORDER BY updated_at DESC, id",
        ['%' + search.toLowerCase().replace(/[!%_]/g, '!$&') + '%']);
    },
    async get(id) {
      return (await query('SELECT * FROM study_sets WHERE id = ?', [id]))[0];
    },
    async create(title, notes) {
      return (await query('INSERT INTO study_sets VALUES (?, ?, ?, ?) RETURNING *',
        [randomUUID(), title, notes, new Date().toISOString()]))[0];
    },
    async update(id, title, notes) {
      return (await query('UPDATE study_sets SET title = ?, notes = ?, updated_at = ? WHERE id = ? RETURNING *',
        [title, notes, new Date().toISOString(), id]))[0];
    },
    async remove(id) {
      return (await query('DELETE FROM study_sets WHERE id = ? RETURNING id', [id])).length === 1;
    },
    async addAttempt(setId, { id, mode, score, total, missed }) {
      await query(`INSERT INTO attempts (id, set_id, mode, score, total, missed, created_at)
        SELECT ?, id, ?, ?, ?, ?, ? FROM study_sets WHERE id = ? ON CONFLICT (id) DO NOTHING`,
      [id, mode, score, total, JSON.stringify(missed), new Date().toISOString(), setId]);
      return (await query('SELECT id, score, total FROM attempts WHERE id = ? AND set_id = ?', [id, setId]))[0];
    },
    async progress(id) {
      const rows = await query('SELECT * FROM attempts WHERE set_id = ? ORDER BY created_at DESC, id LIMIT 50', [id]);
      return rows.map((row) => ({ ...row, missed: JSON.parse(row.missed) }));
    },
    async reset(id) {
      await query('DELETE FROM attempts WHERE set_id = ?', [id]);
    }
  };
}

module.exports = { openDatabase };
