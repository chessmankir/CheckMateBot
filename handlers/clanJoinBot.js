const fs = require('fs');
const DATA_FILE = 'clanMembers.json';

const usersInProcess = new Map();

function saveToJSON(userData) {
  let data = [];
  if (fs.existsSync(DATA_FILE)) {
    data = JSON.parse(fs.readFileSync(DATA_FILE));
  }
  data.push(userData);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = function(bot, notifyChatId) {
  // Команда /join
  bot.onText(/\/join/, (msg) => {
    const chatId = msg.chat.id;
    console.log('join');

    bot.sendMessage(chatId, 'Хочешь вступить в клан?', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Да', callback_data: 'join_yes' }],
          [{ text: '❌ Нет', callback_data: 'join_no' }]
        ]
      }
    });
  });

  // Обработка кнопок Да/Нет
  bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;

    if (query.data === 'join_no') {
      bot.sendMessage(chatId, 'Хорошо, может в следующий раз 😊');
      return;
    }

    if (query.data === 'join_yes') {
      usersInProcess.set(userId, { step: 'id', data: {} });
      bot.sendMessage(chatId, 'Отлично! Введи свой PUBG ID:');
    }
  });

  // Последовательный ввод данных
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (msg.text.startsWith('/')) return;
    if (!usersInProcess.has(userId)) return;

    const user = usersInProcess.get(userId);
    const text = msg.text.trim();

    if (user.step === 'id') {
      user.data.pubgId = text;
      user.step = 'name';
      bot.sendMessage(chatId, 'Теперь введи своё имя:');
    } else if (user.step === 'name') {
      user.data.name = text;
      user.step = 'age';
      bot.sendMessage(chatId, 'Сколько тебе лет?');
    } else if (user.step === 'age') {
      user.data.age = text;
      user.step = 'city';
      bot.sendMessage(chatId, 'Из какого ты города?');
    } else if (user.step === 'city') {
      user.data.city = text;

      saveToJSON({
        telegram_id: userId,
        telegram_username: msg.from.username || '',
        ...user.data
      });

      bot.sendMessage(chatId, `🎉 Ты принят в клан!\n📥 Приглашение: [ссылка на вступление]`);
      usersInProcess.delete(userId);
    }
  });
};
