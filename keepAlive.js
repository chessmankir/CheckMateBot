const express = require('express');

function keepAlive() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.send('🤖 Бот активен! Replit не засыпает.');
  });

  app.listen(PORT, () => {
    console.log(`🌐 HTTP-сервер работает на порту ${PORT}`);
  });
}

module.exports = keepAlive;
