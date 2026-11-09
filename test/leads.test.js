const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Cada ejecución utiliza un archivo aislado, sin borrar ni alterar leads reales.
const directory = mkdtempSync(path.join(tmpdir(), 'mini-crm-test-'));
process.env.DATABASE_PATH = path.join(directory, 'leads.sqlite');
const app = require('../src/app');
const { db } = require('../src/database');

// Otro proceso abre el mismo archivo para comprobar que los cambios están en disco.
function readPersistedLeads() {
  return JSON.parse(execFileSync(process.execPath, ['-e', `
    const { db, statements } = require('./src/database');
    console.log(JSON.stringify(statements.list.all()));
    db.close();
  `], { cwd: path.join(__dirname, '..'), encoding: 'utf8' }));
}

test('crear, editar y eliminar leads con validación', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method = 'GET', body) => fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  try {
    // Sin registros, la descarga sigue siendo un CSV válido con cabecera.
    const emptyCsv = await request('/leads/export');
    assert.equal(emptyCsv.status, 200);
    assert.match(emptyCsv.headers.get('content-type'), /^text\/csv; charset=utf-8$/);
    assert.match(emptyCsv.headers.get('content-disposition'), /^attachment; filename=(?:"leads\.csv"|leads\.csv)$/);
    assert.equal(await emptyCsv.text(), 'name,email,source,status,created_at\r\n');
    const response = await request('/leads', 'POST', { name: 'Ana', email: 'ana@example.com' });
    assert.equal(response.status, 201);
    const original = await response.json();
    assert.deepEqual(readPersistedLeads(), [original]);
    const path = `/leads/${original.id}`;
    const updated = { name: ' Ana García ', email: 'nuevo@example.com', source: ' Web ', status: 'contactado' };
    const edit = await request(path, 'PUT', { ...updated, id: 'otro', createdAt: 'otro' });
    assert.equal(edit.status, 200);
    const lead = await edit.json();
    assert.deepEqual(lead, { ...original, ...updated, name: 'Ana García', source: 'Web' });
    assert.deepEqual(readPersistedLeads(), [lead]);
    for (const invalid of [{ name: '' }, { email: null }, { source: 7 }, { status: 'incorrecto' }]) {
      assert.equal((await request(path, 'PUT', { ...updated, ...invalid })).status, 400);
    }
    assert.deepEqual(await (await request('/leads')).json(), [lead]);
    assert.equal((await request('/leads/inexistente', 'PUT', updated)).status, 404);
    assert.equal((await request('/leads/inexistente', 'DELETE')).status, 404);
    assert.deepEqual(await (await request('/leads')).json(), [lead]);
    const deletion = await request(path, 'DELETE');
    assert.equal(deletion.status, 204);
    assert.equal(await deletion.text(), '');
    assert.deepEqual(await (await request('/leads')).json(), []);
    assert.deepEqual(readPersistedLeads(), []);
    assert.equal((await request(path, 'DELETE')).status, 404);

    // Comprueba varios registros, caracteres especiales y la fecha con nombre CSV.
    const special = await (await request('/leads', 'POST', {
      name: 'María, "López"', email: 'maria@example.com', source: 'Web\nReferido', status: 'contactado'
    })).json();
    const second = await (await request('/leads', 'POST', {
      name: 'José', email: 'jose@example.com'
    })).json();
    const exported = await request('/leads/export');
    const bytes = Buffer.from(await exported.arrayBuffer());
    assert.deepEqual([...bytes.subarray(0, 3)], [0xEF, 0xBB, 0xBF]);
    assert.equal(bytes.toString('utf8'), '\uFEFFname,email,source,status,created_at\r\n' +
      `"María, ""López""","maria@example.com","Web\nReferido","contactado","${special.createdAt}"\r\n` +
      `"José","jose@example.com","","nuevo","${second.createdAt}"\r\n`);
    assert.deepEqual(await (await request('/leads')).json(), [special, second]);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
