const TelegramBot = require('node-telegram-bot-api');

const { token, notifyChatId, threadMessageId } = require('./config');
const bot = new TelegramBot(token, { polling: true });
// const memberHandlers = require('./handlers/memberHandlers');
require('./handlers/memberHandlers')(bot, notifyChatId, threadMessageId);

console.log('запускаю бота с токеном', threadMessageId);


// Вставь сюда свой токен от @BotFather
//const token = '7817780652:AAF-9kNx5ucwXyBFil2yzzI66kF05lKGJ9c';


bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, `Команды:
  /start – начать
  /help – помощь
  /menu – показать меню`);
});


const { InlineKeyboardButton, InlineKeyboardMarkup } = require('node-telegram-bot-api');

bot.onText(/\/menu/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Выбери:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📅 Расписание', callback_data: 'schedule' }],
        [{ text: '📍 Локация', callback_data: 'location' }]
      ]
    }
  });
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;

  if (query.data === 'schedule') {
    bot.sendMessage(chatId, 'Вот твоё расписание: ...');
  }
  if (query.data === 'location') {
    bot.sendMessage(chatId, 'Моя локация: 📍 Планета Земля');
  }
});


bot.on('left_chat_member', (msg) => {
  console.log('вышел из сата');
  const user = msg.left_chat_member;

  const name = user.username
    ? `@${user.username}`
    : `${user.first_name} ${user.last_name || ''}`.trim();

  const message = `🚪 Вышел из группы: ${name}`;
  console.log(message);

  bot.sendMessage(notifyChatId, message, {
    reply_to_message_id: threadMessageId
  });
});




 //console.log(`Пользователь написал: ${msg.text}`);


