const Database = require('better-sqlite3');
const path = require('node:path');

// La ruta absoluta mantiene el mismo archivo aunque se arranque desde otra carpeta.
// Las pruebas pueden indicar otro archivo para no modificar los datos reales.
const databasePath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'leads.sqlite');
const db = new Database(databasePath);

// SQLite crea el archivo y la tabla en el primer arranque y los reutiliza después.
// Los nombres de los campos coinciden con el JSON que ya consume el frontend.
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'nuevo'
      CHECK (status IN ('nuevo', 'contactado', 'perdido')),
    createdAt TEXT NOT NULL
  )
`);

// Las consultas preparadas separan los datos del SQL, incluso si contienen comillas.
const statements = {
  list: db.prepare('SELECT * FROM leads ORDER BY rowid'),
  get: db.prepare('SELECT * FROM leads WHERE id = ?'),
  insert: db.prepare(`
    INSERT INTO leads (id, name, email, source, status, createdAt)
    VALUES (@id, @name, @email, @source, @status, @createdAt)
  `),
  update: db.prepare(`
    UPDATE leads SET name = @name, email = @email, source = @source, status = @status
    WHERE id = @id
  `),
  delete: db.prepare('DELETE FROM leads WHERE id = ?')
};

module.exports = { db, statements };
