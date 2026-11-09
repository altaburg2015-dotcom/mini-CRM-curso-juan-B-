const express = require('express');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { statements } = require('./database');

const app = express();

app.use(express.json());

// La interfaz del CRM se sirve en la raíz; las rutas de datos se mantienen debajo.
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/leads', (req, res) => {
  // Lee los registros persistidos, conservando el orden de alta.
  res.json(statements.list.all());
});

app.get('/leads/export', (req, res) => {
  // Exporta todos los registros; los filtros del navegador no afectan a la descarga.
  // Entrecomillar y duplicar comillas conserva comas y saltos de línea en los datos.
  const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = statements.list.all().map((lead) =>
    [lead.name, lead.email, lead.source, lead.status, lead.createdAt].map(csvCell).join(',')
  );
  const csv = ['name,email,source,status,created_at', ...rows].join('\r\n') + '\r\n';

  // La marca UTF-8 facilita que Excel reconozca tildes y otros caracteres.
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.attachment('leads.csv');
  res.send('\uFEFF' + csv);
});

// Valida y normaliza los datos antes de escribirlos en SQLite.
function validateLead(req, res, next) {
  const { name, email, source = '', status = 'nuevo' } = req.body || {};

  if (typeof name !== 'string' || !name.trim() ||
      typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({
      error: 'Los campos name y email son obligatorios y deben ser textos no vacíos.'
    });
  }

  if (typeof source !== 'string' || !['nuevo', 'contactado', 'perdido'].includes(status)) {
    return res.status(400).json({
      error: 'Fuente debe ser texto y estado debe ser nuevo, contactado o perdido.'
    });
  }

  res.locals.leadData = {
    name: name.trim(),
    email: email.trim(),
    source: source.trim(),
    status
  };
  next();
}

app.post('/leads', validateLead, (req, res) => {
  const lead = {
    ...res.locals.leadData,
    id: randomUUID(),
    createdAt: new Date().toISOString()
  };

  // Guarda el identificador y la fecha junto con los datos del formulario.
  statements.insert.run(lead);
  res.status(201).json(lead);
});

app.put('/leads/:id', validateLead, (req, res) => {
  // Solo actualiza campos editables; el ID y la fecha original se conservan.
  const result = statements.update.run({ ...res.locals.leadData, id: req.params.id });
  if (result.changes === 0) return res.status(404).json({ error: 'Lead no encontrado.' });
  res.json(statements.get.get(req.params.id));
});

app.delete('/leads/:id', (req, res) => {
  // El número de filas eliminadas permite detectar un identificador inexistente.
  const result = statements.delete.run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Lead no encontrado.' });
  res.status(204).end();
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición debe ser JSON válido.' });
  }

  if (err.status === 413) {
    return res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande.' });
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

module.exports = app;
