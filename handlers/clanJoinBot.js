const fs = require('fs');
const DATA_FILE = 'clanMembers.json';

const usersInProcess = new Map();

function saveToJSON(userData) {
  console.log('save')
  let data = [];
  if (fs.existsSync(DATA_FILE)) {
    data = JSON.parse(fs.readFileSync(DATA_FILE));
  }
  data.push(userData);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = function(bot, notifyChatId, inviteLink1, inviteLink2) {
  // Команда /join
  bot.onText(/\/join/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Хочешь вступить в клан?', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Да', callback_data: 'join_yes' }],
          [{ text: '❌ Нет', callback_data: 'join_no' }]
        ]
      }
    });
  });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Приветственный текст
    const welcomeText = 'Добро пожаловать в комьюнити Checkmate! ♟️';

    // Отправляем изображение
    bot.sendPhoto(chatId, fs.readFileSync('./Images/IMG_3371.png'), {
      caption: welcomeText,
      filename: 'welcome_image.png',
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Тгк ChessmanKir 🧩', url: 'https://t.me/chessmankirLive' },
            { text: 'Новости Pubg 🤝', url: 'https://t.me/winepubgm' }
          ],
          [
            { text: 'Хочешь вступить в клан?', callback_data: 'join_clan' }
          ]
        ]
      }
    });
  });

  // Обработка нажатия "Хочешь вступить в клан?"
  bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;

    if (query.data === 'join_clan') {
      bot.sendMessage(chatId, 'Ты хочешь вступить в клан?', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Да ✅', callback_data: 'join_yes' },
              { text: 'Нет ❌', callback_data: 'join_no' }
            ]
          ]
        }
      });
    }
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
      usersInProcess.set(userId, { step: 'invite', data: {} });
      bot.sendMessage(chatId, 'Введи свой инвайт-код:');
      
    }
  });

  // Последовательный ввод данных
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!msg.text || msg.text.startsWith('/')) return;
    if (!usersInProcess.has(userId)) return;

    const user = usersInProcess.get(userId);
    const text = msg.text.trim();

    if (user.step === 'invite'){
      const inviteCode = text;
      const codes = fs.existsSync('./data/invite_codes.json')
        ? JSON.parse(fs.readFileSync('./data/invite_codes.json'))
        : [];

      const found = codes.find(c => c.code === inviteCode && !c.used);
      if (!found) {
        bot.sendMessage(chatId, '❌ Код недействителен или уже использован. Введи снова:');
        return;
      }

      // Отметить как использованный
      found.used = true;
      fs.writeFileSync('./data/invite_codes.json', JSON.stringify(codes, null, 2));

      user.data.clan = found.clan; // ← сохраняем номер клана
      user.step = 'id';
      bot.sendMessage(chatId, 'Код принят. Теперь введи свой PUBG ID:');
    }

   else if (user.step === 'id') {
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
      
      bot.sendMessage(chatId, `🎉 Ты принят в клан!\n📥 Приглашение:` + inviteLink1);
      usersInProcess.delete(userId);
    }
  });
};