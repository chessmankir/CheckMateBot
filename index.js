const TelegramBot = require('node-telegram-bot-api');
const { notifyChatId, threadMessageId, inviteLink1, inviteLink2 } = require('./config');

require('dotenv').config(); // Загружает переменные из .env
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });
// Обработка ошибок polling
bot.on('polling_error', (error) => {
  console.log('Детали ошибки polling:', error.code, error.message);
  if (error.code === 'EFATAL') {
    console.log('Критическая ошибка - возможно неверный токен или бот уже запущен');
  }
});

bot.on('error', (error) => {
  console.log('Общая ошибка бота:', error);
});
const usernameMap = new Map();
// const memberHandlers = require('./handlers/memberHandlers');
require('./handlers/memberHandlers')(bot, notifyChatId, threadMessageId);
require('./handlers/inviteGenerator')(bot); // ← генератор инвайтов
require('./handlers/clanJoinBot')(bot, notifyChatId, inviteLink1, inviteLink2);
require('./handlers/saveDescription')(bot, usernameMap);
require('./handlers/getDescription')(bot, usernameMap);
require('./handlers/getClanList')(bot, usernameMap);
require('./handlers/findMember')(bot, usernameMap);
const keepAlive = require('./keepAlive'); // ← подключаем сервер

// 🟢 Запускаем HTTP-сервер (не даст Replit заснуть)
keepAlive();
const getUserInfo = require('./handlers/getUserInfo');
bot.on('message', (msg) => getUserInfo(bot, msg, token));