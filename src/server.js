const app = require('./app');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`API de leads disponible en http://localhost:${port}`);
});
