// keepAlive.js
const express = require('express');

function keepAlive() {
  const app = express();

  // На Timeweb иногда PORT не прокидывают в Dockerfile-режиме.
  // Поэтому слушаем process.env.PORT ИЛИ 8080 (самый ожидаемый порт платформой).
  const PORT = Number(process.env.PORT || 8080);

  app.get('/', (_req, res) => res.status(200).send('✅ Bot is alive'));
  app.get('/health', (_req, res) => res.send('ok'));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ HTTP healthcheck listening on ${PORT} (0.0.0.0)`);
  });
}

module.exports = keepAlive;
