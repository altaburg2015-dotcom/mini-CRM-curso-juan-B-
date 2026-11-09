# Resumen ejecutivo del Mini CRM

1. **Objetivo.** La aplicación gestiona contactos comerciales potenciales, llamados leads. Permite crearlos, consultarlos, editarlos y eliminarlos.

2. **Datos de cada contacto.** Cada lead tiene nombre, email, fuente, estado, identificador y fecha de creación. Los estados son nuevo, contactado y perdido.

3. **Interfaz sencilla.** Incluye un formulario y una tabla de contactos. Permite buscar por nombre o email y filtrar por estado desde el navegador.

4. **Datos persistentes.** Los contactos se guardan en el archivo `leads.sqlite`. Se conservan al reiniciar el servidor. El archivo necesita copias de seguridad y no se incluye en Git.

5. **Tecnologías.** El servidor utiliza Node.js y Express. La base de datos es SQLite, con la biblioteca `better-sqlite3`. La interfaz usa HTML, CSS y JavaScript.

6. **Organización del código.** `public/` contiene la interfaz. `src/` contiene el servidor, los endpoints y el acceso a la base de datos. `test/` contiene las pruebas. El README explica cómo ejecutar el proyecto.

7. **Flujo de creación.** El formulario envía los datos a `POST /leads`. El servidor los valida, añade un identificador y una fecha, y los guarda en SQLite. Después, el navegador vuelve a consultar la lista y actualiza la tabla.

8. **Arranque y pruebas.** El proyecto requiere Node.js 22 o superior. Se instala con `npm ci` y se inicia con `npm start`. La interfaz está en `http://localhost:3000/index.html`. Según el informe, la prueba de API y persistencia pasa; aún no hay pruebas automatizadas de la interfaz.

9. **Limitaciones actuales.** No hay inicio de sesión ni permisos. El servidor no comprueba el formato del email y admite correos duplicados. El borrado es definitivo. El pie de página todavía indica, por error, que los datos se pierden al reiniciar.

10. **Próximos pasos.** Conviene corregir ese mensaje, mejorar las validaciones, añadir acceso protegido y preparar copias de seguridad. Después se pueden ampliar las pruebas y añadir paginación, notas, responsables, tareas e importación y exportación de contactos.
