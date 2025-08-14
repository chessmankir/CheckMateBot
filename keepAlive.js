// keepAlive.js
const express = require('express');

function keepAlive() {
  const app = express();

  // На Timeweb PORT задаётся автоматически — берём его без запасного варианта
  const PORT = process.env.PORT;

  // Простой healthcheck-эндпоинт
  app.get('/', (_req, res) => {
    res.send('🤖 Бот активен!');
  });

  // Слушаем на всех интерфейсах, чтобы Timeweb увидел порт
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP-сервер работает на порту ${PORT}`);
  });
}

module.exports = keepAlive;
