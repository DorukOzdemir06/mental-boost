const Database = require('better-sqlite3');
const db = new Database('./mental-boost.db');

try {
  db.transaction(() => {
    // 1. Rename existing table
    db.prepare("ALTER TABLE attempt_logs RENAME TO attempt_logs_old").run();
    
    // 2. Create new table matching schema without the FK constraint
    db.prepare(`
      CREATE TABLE attempt_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        topic_slug TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        time_taken_ms INTEGER NOT NULL,
        combo_count INTEGER NOT NULL DEFAULT 0,
        xp_earned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `).run();
    
    // 3. Copy data
    db.prepare(`
      INSERT INTO attempt_logs (id, question_id, topic_slug, is_correct, time_taken_ms, combo_count, xp_earned, created_at)
      SELECT id, question_id, topic_slug, is_correct, time_taken_ms, combo_count, xp_earned, created_at FROM attempt_logs_old
    `).run();
    
    // 4. Drop old table
    db.prepare("DROP TABLE attempt_logs_old").run();
  })();
  console.log("Successfully removed foreign key constraint from attempt_logs");
} catch (e) {
  console.error(e);
}
