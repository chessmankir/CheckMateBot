const TelegramBot = require('node-telegram-bot-api');

const { token, notifyChatId, threadMessageId } = require('./config');
const bot = new TelegramBot(token, { polling: true });
// const memberHandlers = require('./handlers/memberHandlers');
require('./handlers/memberHandlers')(bot, notifyChatId, threadMessageId);
require('./handlers/clanJoinBot')(bot, notifyChatId);

console.log('запускаю бота с токеном', threadMessageId);


// Вставь сюда свой токен от @BotFather
//const token = '7817780652:AAF-9kNx5ucwXyBFil2yzzI66kF05lKGJ9c';






