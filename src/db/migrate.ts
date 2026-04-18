import fs from 'fs';
import path from 'path';
import { pool } from './pool';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export async function runMigrations(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    // Create migrations tracking table if it doesn't exist
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Get already-applied migrations
    const [rows] = await conn.execute('SELECT filename FROM _migrations ORDER BY filename');
    const applied = new Set((rows as Array<{ filename: string }>).map(r => r.filename));

    // Read and sort migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      console.log(`[migrate] Applying ${file}...`);

      // Strip comment-only lines, then split on semicolons
      const cleaned = sql
        .split('\n')
        .filter(line => !line.trimStart().startsWith('--'))
        .join('\n');
      const statements = cleaned
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Disable FK checks so tables can be created in any order
      await conn.execute('SET FOREIGN_KEY_CHECKS=0');
      for (const statement of statements) {
        await conn.execute(statement);
      }
      await conn.execute('SET FOREIGN_KEY_CHECKS=1');

      await conn.execute(
        'INSERT INTO _migrations (filename) VALUES (?)',
        [file]
      );
      console.log(`[migrate] Applied ${file}`);
    }

    console.log('[migrate] All migrations up to date.');
  } finally {
    conn.release();
  }
}

// Allow running directly: npx tsx src/db/migrate.ts
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[migrate] Failed:', err);
      process.exit(1);
    });
}
