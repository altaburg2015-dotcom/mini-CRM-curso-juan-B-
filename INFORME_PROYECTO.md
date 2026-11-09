# Informe técnico del Mini CRM

Fecha de revisión: 6 de noviembre de 2026.

## 1. Descripción general

El Mini CRM es una aplicación web para gestionar leads, es decir, contactos comerciales potenciales. Permite crear, consultar, editar y eliminar contactos con nombre, email, fuente y estado. Los estados disponibles son `nuevo`, `contactado` y `perdido`.

La pantalla incluye búsqueda por nombre o email, filtro por estado, contador de resultados y actualización manual de la lista. La búsqueda y los filtros se aplican en el navegador sobre los datos descargados.

El servidor sirve tanto los archivos del frontend como una API HTTP. Los datos se guardan en SQLite y se conservan al reiniciar. No hay usuarios, autenticación ni separación de contactos por equipo: todas las peticiones acceden a la misma colección.

## 2. Estructura del proyecto

```text
Mini_CRM_prueba_curso_codex/
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── src/
│   ├── server.js
│   ├── app.js
│   └── database.js
├── test/
│   └── leads.test.js
├── leads.sqlite
├── package.json
├── package-lock.json
├── .gitignore
├── README.md
├── INFORME_PROYECTO.md
└── node_modules/             # Dependencias instaladas; excluidas de Git
```

## 3. Responsabilidad de los archivos principales

| Archivo | Responsabilidad |
| --- | --- |
| `public/index.html` | Define el formulario, los filtros, la tabla y las zonas de mensajes. Carga el CSS y el JavaScript del navegador. |
| `public/app.js` | Maneja los eventos, realiza peticiones con `fetch`, mantiene la lista descargada y dibuja la tabla. Controla la edición y bloquea acciones durante el guardado o borrado. |
| `public/styles.css` | Define colores, distribución, botones, etiquetas de estado, foco visible y adaptación a pantallas pequeñas. |
| `src/server.js` | Importa la aplicación y abre el puerto HTTP, por defecto el 3000. |
| `src/app.js` | Configura Express, procesa JSON, sirve archivos estáticos, valida los datos y define los endpoints y las respuestas de error. |
| `src/database.js` | Abre el archivo SQLite, crea la tabla si no existe y prepara las consultas SQL de lectura, inserción, actualización y borrado. |
| `test/leads.test.js` | Ejecuta una prueba de integración de la API con una base temporal y comprueba la persistencia desde procesos separados. |
| `leads.sqlite` | Contiene los datos persistentes. Se crea automáticamente y está excluido de Git. |
| `package.json` | Declara dependencias, requisito de Node.js y comandos de arranque, desarrollo y pruebas. |
| `package-lock.json` | Registra las versiones resueltas de las dependencias para reproducir la instalación. |
| `.gitignore` | Excluye dependencias, `.env`, registros de npm y archivos cuyo nombre empieza por `leads.sqlite`. |
| `README.md` | Explica instalación, ejecución, endpoints y pruebas. |
| `INFORME_PROYECTO.md` | Documenta la arquitectura y orienta la continuación del desarrollo. |

Los dos archivos llamados `app.js` tienen funciones diferentes: el de `public` se ejecuta en el navegador y el de `src` en Node.js.

## 4. Flujo completo de creación de un lead

```text
Formulario → public/app.js → POST /leads → validación en Express
           → consulta preparada → leads.sqlite
           → respuesta 201 → GET /leads → actualización de la tabla
```

1. Al arrancar el servidor, `src/server.js` carga `src/app.js`. Este importa `src/database.js`, que abre la base y ejecuta `CREATE TABLE IF NOT EXISTS`.
2. La persona abre `/index.html`, completa nombre, email, fuente y estado y pulsa «Añadir lead». El HTML exige nombre y email y utiliza un campo de tipo email.
3. `public/app.js` intercepta el envío para evitar recargar la página. Elimina espacios exteriores, comprueba nombre y email y desactiva temporalmente los controles de escritura.
4. El navegador envía `POST /leads` con `Content-Type: application/json` y los campos `name`, `email`, `source` y `status`.
5. `express.json()` convierte el cuerpo JSON en `req.body`. La función `validateLead` comprueba los tipos y valores permitidos y coloca los datos normalizados en `res.locals.leadData`.
6. El endpoint genera un identificador con `randomUUID()` y una fecha UTC en formato ISO con `new Date().toISOString()`.
7. `statements.insert.run(lead)` inserta el registro en SQLite mediante parámetros. Los valores se pasan separados de la sentencia SQL.
8. Cuando termina la inserción, la API responde con estado `201` y el objeto completo, incluido su identificador y fecha.
9. El frontend limpia el formulario, muestra un mensaje de éxito y llama a `loadLeads()`. Esta función hace un nuevo `GET /leads`, almacena el resultado en `allLeads` y reconstruye la tabla aplicando los filtros actuales.

`allLeads` es una copia temporal para mostrar y filtrar la lista; la fuente persistente de datos es SQLite. La tabla se construye con `textContent`, por lo que los valores de los leads se presentan como texto.

### Modelo de datos

Todos los campos se almacenan como `TEXT` y son obligatorios en la tabla.

| Campo | Significado y reglas |
| --- | --- |
| `id` | Identificador UUID generado por el servidor; clave primaria. |
| `name` | Nombre. La API exige texto no vacío y elimina espacios exteriores. |
| `email` | Correo. La API exige texto no vacío, pero no verifica su formato ni su unicidad. |
| `source` | Fuente del contacto. Si se omite, toma el valor `''`. |
| `status` | Estado. Por defecto `nuevo`; una restricción SQL limita los valores a los tres estados admitidos. |
| `createdAt` | Fecha de creación generada por el servidor; se conserva al editar. |

### Contrato de la API

| Método y ruta | Comportamiento | Respuesta correcta |
| --- | --- | --- |
| `GET /` | Mensaje de funcionamiento de la API; no abre el formulario. | `200`, texto |
| `GET /leads` | Devuelve todos los leads ordenados por `rowid`, sin paginación. | `200`, array JSON |
| `POST /leads` | Crea un lead. | `201`, lead creado |
| `PUT /leads/:id` | Actualiza nombre, email, fuente y estado; conserva ID y fecha. | `200`, lead actualizado |
| `DELETE /leads/:id` | Borra definitivamente el registro. | `204`, sin cuerpo |

La edición requiere nombre y email. Si se omiten fuente o estado, se aplican sus valores por defecto; no es una actualización parcial. Editar carga el contacto en el mismo formulario y cambia el envío a `PUT`. Cancelar edición solo restablece el formulario.

La API devuelve `400` ante datos inválidos o JSON mal formado, `404` cuando el registro a editar o borrar no existe, `413` si el cuerpo supera el límite admitido y `500` ante otros errores internos. La validación se ejecuta antes de buscar el registro en una edición. El frontend muestra mensajes cuando falla una operación o la conexión.

## 5. Tecnologías y ejecución

| Tecnología | Uso actual |
| --- | --- |
| Node.js | Ejecuta el backend. El proyecto declara versión mínima 22 y utiliza módulos CommonJS (`require`). |
| Express | Servidor HTTP, rutas, middleware JSON y archivos estáticos. Versión instalada comprobada: 5.3.0; rango declarado: `^5.1.0`. |
| SQLite y `better-sqlite3` | Base de datos local en archivo y acceso SQL síncrono. Versión instalada del paquete: 13.0.3. |
| HTML, CSS y JavaScript | Interfaz sin framework ni proceso de compilación. |
| Fetch API y JSON | Comunicación entre navegador y servidor. |
| `node:test` y `node:assert/strict` | Pruebas y aserciones incluidas en Node.js. |
| npm | Instalación de dependencias y ejecución de comandos. |

Desde la carpeta del proyecto:

```sh
npm ci
npm start
```

La interfaz está en `http://localhost:3000/index.html`. `npm run dev` arranca con vigilancia de cambios y `npm test` ejecuta las pruebas.

La variable de entorno `PORT` permite cambiar el puerto. `DATABASE_PATH` permite elegir otro archivo SQLite; su carpeta debe existir. Sin esa variable, la ruta se resuelve respecto al proyecto, independientemente de la carpeta desde la que se lance Node. El código no carga un archivo `.env` automáticamente.

SQLite no requiere un servidor de base de datos separado. Para conservar los datos en un despliegue, el archivo debe estar en almacenamiento persistente. El README propone detener el servidor y copiar el archivo para realizar una copia de seguridad.

### Verificación realizada

Durante esta revisión se ha ejecutado `npm test`: una prueba aprobada y ninguna fallida. Comprueba creación, edición, borrado, algunas entradas inválidas, registros inexistentes, conservación de ID y fecha, y lectura de los cambios desde otro proceso. Utiliza una base temporal que elimina al terminar, sin modificar la base real.

No hay pruebas automatizadas de la interfaz ni se ha realizado una validación visual en navegador en esta revisión. La prueba actual tampoco cubre todas las ramas de error o escenarios de concurrencia.

## 6. Mejoras y ampliaciones propuestas

Estas propuestas no están implementadas; se organizan por utilidad para continuar el proyecto.

| Prioridad | Mejora | Motivo |
| --- | --- | --- |
| Inmediata | Corregir el pie de página de `public/index.html`. | Todavía indica que los datos se borran al reiniciar; contradice la persistencia actual en SQLite. |
| Alta | Validar formato de email y longitudes máximas en el backend. | La validación HTML puede omitirse enviando peticiones directamente a la API. |
| Alta | Definir una política de duplicados. | Actualmente se pueden crear varios leads con el mismo email; habría que decidir si es deseable antes de imponer unicidad. |
| Alta si se comparte por red | Incorporar autenticación y permisos. | Actualmente no se comprueba quién consulta, modifica o borra los contactos. |
| Alta | Añadir copias de seguridad y probar su restauración. | El archivo SQLite contiene los datos operativos y no se versiona en Git. |
| Media | Añadir confirmación o recuperación de borrados. | El botón Eliminar borra de inmediato y no hay papelera. |
| Media | Ampliar las pruebas de API y añadir pruebas de navegador. | Cubrir JSON mal formado, altas inválidas, errores de almacenamiento, filtros y edición desde la interfaz. |
| Media | Introducir migraciones de esquema. | `CREATE TABLE IF NOT EXISTS` crea la tabla inicial, pero no modifica una tabla existente al añadir columnas. |
| Media | Llevar búsqueda y filtros al servidor y añadir paginación. | Actualmente cada consulta descarga todos los leads y el navegador filtra la colección completa. |
| Según crecimiento | Separar rutas, validación y acceso a datos; permitir inyectar la conexión. | Facilitar nuevas entidades y pruebas aisladas sin depender de módulos globales y variables de entorno. |
| Según crecimiento | Medir concurrencia y duración de consultas. | El acceso síncrono ocupa el hilo de ejecución mientras trabaja; las necesidades reales determinarán ajustes o un cambio de almacenamiento. |
| Funcional | Añadir notas, responsables, tareas, historial, fecha de última modificación e importación/exportación. | Convertir la lista de contactos en una herramienta de seguimiento comercial. |

Para añadir un campo, los puntos principales de cambio son el esquema y su migración en la capa de datos, la validación y los endpoints, el formulario y la representación en el navegador, y las pruebas del contrato de la API. Para añadir un estado, también deben actualizarse la restricción SQL, los selectores, la validación y sus estilos.
