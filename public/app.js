const form = document.querySelector('#lead-form');
const submitButton = document.querySelector('#submit-button');
const refreshButton = document.querySelector('#refresh-button');
const message = document.querySelector('#message');
const listStatus = document.querySelector('#list-status');
const tbody = document.querySelector('#leads-body');
const count = document.querySelector('#lead-count');
const cancelButton = document.querySelector('#cancel-button');
const formTitle = document.querySelector('#form-title');
const searchInput = document.querySelector('#lead-search');
const statusFilter = document.querySelector('#status-filter');
let allLeads = [];
let editingId = null;
let busy = false;

function resetForm() {
  form.reset();
  editingId = null;
  formTitle.textContent = 'Nuevo lead';
  submitButton.textContent = 'Añadir lead';
  cancelButton.hidden = true;
}

function setBusy(value) {
  busy = value;
  for (const control of form.elements) control.disabled = value;
  for (const button of tbody.querySelectorAll('button')) button.disabled = value;
  refreshButton.disabled = value;
}

function editLead(lead) {
  if (busy) return;
  editingId = lead.id;
  for (const field of ['name', 'email', 'source', 'status']) {
    form.elements[field].value = lead[field] || (field === 'status' ? 'nuevo' : '');
  }
  formTitle.textContent = 'Editar lead';
  submitButton.textContent = 'Guardar cambios';
  cancelButton.hidden = false;
  message.textContent = '';
  form.elements.name.focus();
}

async function deleteLead(lead) {
  if (busy) return;
  setBusy(true);
  message.className = '';
  message.textContent = '';
  try {
    const response = await fetch(`/leads/${encodeURIComponent(lead.id)}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'No se ha podido eliminar el lead.');
    }
    if (editingId === lead.id) resetForm();
    message.textContent = 'Lead eliminado correctamente.';
    await loadLeads();
  } catch (error) {
    message.className = 'error';
    message.textContent = error.message === 'Failed to fetch'
      ? 'No se pudo conectar con la API. Inténtalo de nuevo.' : error.message;
  } finally {
    setBusy(false);
  }
}

function showLeads() {
  const query = searchInput.value.trim().toLocaleLowerCase('es');
  const leads = allLeads.filter(lead =>
    [lead.name, lead.email].some(value => (value || '').toLocaleLowerCase('es').includes(query)) &&
    (!statusFilter.value || (lead.status || 'nuevo') === statusFilter.value)
  );
  tbody.replaceChildren();
  for (const lead of leads) {
    const row = document.createElement('tr');
    for (const value of [lead.name, lead.email, lead.source || '—']) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    const status = lead.status || 'nuevo';
    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'status-badge';
    if (['nuevo', 'contactado', 'perdido'].includes(status)) {
      badge.classList.add(`status-badge--${status}`);
    }
    badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    statusCell.append(badge);
    row.append(statusCell);
    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    for (const [label, className, action] of [
      ['Editar', 'secondary', editLead],
      ['Eliminar', 'danger', deleteLead]
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.className = className;
      button.disabled = busy;
      button.setAttribute('aria-label', `${label} a ${lead.name}`);
      button.addEventListener('click', () => action(lead));
      actions.append(button);
    }
    actionsCell.append(actions);
    row.append(actionsCell);
    tbody.append(row);
  }
  count.textContent = `${leads.length} ${leads.length === 1 ? 'visible' : 'visibles'}`;
  listStatus.className = '';
  listStatus.textContent = leads.length ? '' : allLeads.length
    ? 'No hay leads que coincidan con los filtros.'
    : 'Todavía no hay leads. Añade el primero con el formulario.';
}

async function loadLeads() {
  refreshButton.disabled = true;
  listStatus.className = '';
  listStatus.textContent = 'Cargando leads…';
  try {
    const response = await fetch('/leads');
    if (!response.ok) throw new Error('No se han podido cargar los leads. Pulsa Actualizar para reintentar.');
    allLeads = await response.json();
    showLeads();
  } catch (error) {
    listStatus.className = 'error';
    listStatus.textContent = 'No se han podido cargar los leads. Comprueba la conexión y pulsa Actualizar.';
  } finally {
    refreshButton.disabled = busy;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy) return;
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const source = form.elements.source.value.trim();
  const status = form.elements.status.value;
  message.className = '';
  message.textContent = '';
  if (!name || !email) {
    message.className = 'error';
    message.textContent = 'Introduce un nombre y un email.';
    return;
  }
  const updating = editingId !== null;
  setBusy(true);
  submitButton.textContent = 'Guardando…';
  try {
    const response = await fetch(updating ? `/leads/${encodeURIComponent(editingId)}` : '/leads', {
      method: updating ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, source, status })
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'No se ha podido guardar el lead.');
    }
    resetForm();
    message.textContent = updating ? 'Lead actualizado correctamente.' : 'Lead añadido correctamente.';
    await loadLeads();
  } catch (error) {
    message.className = 'error';
    message.textContent = error.message === 'Failed to fetch'
      ? 'No se pudo conectar con la API. Comprueba que el servidor está funcionando.'
      : error.message;
  } finally {
    setBusy(false);
    submitButton.textContent = editingId === null ? 'Añadir lead' : 'Guardar cambios';
    form.elements.name.focus();
  }
});

refreshButton.addEventListener('click', loadLeads);
searchInput.addEventListener('input', showLeads);
statusFilter.addEventListener('change', showLeads);
cancelButton.addEventListener('click', () => {
  if (busy) return;
  resetForm();
  message.textContent = '';
  form.elements.name.focus();
});
loadLeads();
