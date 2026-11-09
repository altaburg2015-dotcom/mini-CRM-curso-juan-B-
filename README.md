# Mini CRM de leads

API con Node.js (22 o superior), Express y SQLite mediante `better-sqlite3`. Los leads se guardan en el archivo `leads.sqlite` dentro del proyecto y se conservan al reiniciar el servidor.

## Instalación y ejecución

```sh
npm install
npm start
```

La API escucha en `http://localhost:3000`. Puedes configurar otro puerto mediante la variable de entorno `PORT`.
Para desarrollo, `npm run dev` reinicia el servidor automáticamente al guardar cambios.

La base de datos y la tabla `leads` se crean automáticamente al arrancar. La tabla contiene `id`, `name` (nombre), `email`, `source` (fuente), `status` (estado) y `createdAt` (fecha de creación en formato ISO). Puedes usar `DATABASE_PATH` para indicar otro archivo en una carpeta existente. El archivo local de datos se excluye de Git; para hacer una copia de seguridad, detén el servidor y copia `leads.sqlite`.

## Endpoints

La interfaz web está disponible en `http://localhost:3000/index.html`. Permite añadir, editar y eliminar leads desde la tabla usando la API. Editar carga los datos en el formulario; Guardar cambios los actualiza y Cancelar edición vuelve al formulario de alta. Eliminar borra el lead directamente. La ruta `/` mantiene el mensaje de estado.

### GET /leads

Devuelve todos los leads como un array JSON (inicialmente `[]`), con estado `200`.

### GET /leads/export

Descarga `leads.csv` con todos los leads de SQLite y las columnas `name,email,source,status,created_at`. La columna `created_at` contiene la fecha `createdAt` del registro; la base de datos y el JSON habitual mantienen sus nombres actuales.

El botón **Exportar todos a CSV** descarga este archivo independientemente de los filtros de la tabla. El CSV utiliza comas, campos entrecomillados y UTF-8 con marca de codificación para conservar tildes. Sin leads, contiene solo la cabecera.

### POST /leads

Recibe `Content-Type: application/json` con los campos `name` y `email`:

```json
{
  "name": "Ana García",
  "email": "ana@example.com"
}
```

Devuelve el lead creado con estado `201`, un `id` generado y la fecha `createdAt`.
Si falta algún campo o está vacío, devuelve `400`. La validación inicial comprueba texto no vacío, no el formato del correo.

Ejemplo en PowerShell con el servidor arrancado:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/leads -ContentType 'application/json' -Body '{"name":"Ana García","email":"ana@example.com"}'
Invoke-RestMethod -Uri http://localhost:3000/leads
```

### PUT /leads/:id

Actualiza `name`, `email`, `source` y `status` con la misma validación que el alta. Conserva `id` y `createdAt` y devuelve el lead actualizado con estado `200`. Los campos opcionales omitidos toman los valores `source: ''` y `status: 'nuevo'`. Devuelve `400` para datos inválidos y `404` si el lead no existe con datos válidos.

### DELETE /leads/:id

Elimina el lead y devuelve `204` sin cuerpo. Devuelve `404` si no existe.

## Pruebas

Ejecuta `npm test` para comprobar el ciclo de creación, edición y eliminación, la validación y los identificadores inexistentes. Las pruebas utilizan un archivo temporal y verifican la persistencia leyendo desde otro proceso después de cada cambio, sin modificar la base real.

## Archivos

- `package.json`: dependencias, versión mínima de Node y comandos de ejecución.
- `src/app.js`: configuración de Express, endpoints y gestión de errores.
- `src/database.js`: apertura de SQLite, creación de la tabla y consultas preparadas.
- `leads.sqlite`: archivo local de la base de datos, creado automáticamente.
- `src/server.js`: arranque del servidor y configuración del puerto.
- `.gitignore`: excluye dependencias, variables locales y registros de npm.
- `public/index.html`: página con formulario y tabla de leads.
- `public/styles.css`: estilos adaptados a móvil y escritorio.
- `public/app.js`: consulta, creación, edición y eliminación de leads con `fetch`.

Al ejecutar `npm install` se generará `package-lock.json`, que fija las versiones instaladas.

Es una base para desarrollo local: todavía no incluye autenticación.
