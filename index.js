const TelegramBot = require('node-telegram-bot-api');
const { notifyChatId, threadMessageId, inviteLink1, inviteLink2 } = require('./config');
// test web

require('dotenv').config(); // Загружает переменные из .env
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, {
  polling: {
    params: {
      allowed_updates: ['message', 'chat_member', 'my_chat_member']
    }
  }
});
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

const { google, displayvideo_v1beta } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '11BRhGaUWPd7dg_lPBHng0mXlpNJcPyRUkPuwSAQOx78';
const SHEET_NAME = 'Clan';


const credentials = JSON.parse(process.env.GOOGLE_SERVICE_JSON);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const testConnection = require('./handlers/dbconnection');

require('./handlers/memberHandlers')(bot, notifyChatId, threadMessageId);
require('./handlers/inviteGenerator')(bot); // ← генератор инвайтов
require('./handlers/banMember')(bot, auth, SPREADSHEET_ID);
require('./handlers/unbanMember')(bot, auth, SPREADSHEET_ID);
require('./handlers/clanJoinBot')(bot, notifyChatId, inviteLink1, inviteLink2);
require('./handlers/getBanList')(bot);
require('./handlers/marriage')(bot);
require('./handlers/listMarriage')(bot);

require('./handlers/landmate')(bot);
// require('./scripts/warmupCities');
require('./handlers/greetings')(bot);


require('./handlers/saveDescription')(bot);
require('./handlers/getDescription')(bot, auth, SPREADSHEET_ID);
require('./handlers/getClanList')(bot, auth, SPREADSHEET_ID);
require('./handlers/copyMembersToDb')(bot, auth, SPREADSHEET_ID);
require('./handlers/findMember')(bot, auth, SPREADSHEET_ID);
require('./handlers/ruleClan')(bot, auth, SPREADSHEET_ID);
require('./handlers/afterJoinMember')(bot, auth, SPREADSHEET_ID);

require('./handlers/synthSheet')(bot, auth, SPREADSHEET_ID);
require('./update/updateClan')(bot, auth, SPREADSHEET_ID);
require('./update/setNick')(bot, auth, SPREADSHEET_ID);
require('./handlers/saveActorIdbyMessage')(bot, auth, SPREADSHEET_ID);
require('./handlers/getTelegramInfo')(bot)
const testData = require('./handlers/testData');
// testData(bot);
const handleChannelForward = require('./handlers/channelForward'); handleChannelForward(bot, '@winepubgm', "-1002549710535"); 
handleChannelForward(bot, '@winepubgm', "-1002833167359");
const keepAlive = require('./keepAlive'); // ← подключаем сервер
// 🟢 Запускаем HTTP-сервер (не даст Replit заснуть)

const getUserInfo = require('./handlers/getUserInfo');
bot.on('message', (msg) => getUserInfo(bot, msg, token));
keepAlive();