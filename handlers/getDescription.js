const SHEET_NAME = 'Clan'; // название листа в Google Sheets
const getPlayerDescription = require('./getDecriptionFunc');
const isAllowedChat = require('./../admin/permissionChats');

module.exports = function (bot, auth, SPREADSHEET_ID) {
  bot.onText(/^!тест/, async (msg, match) => {
     console.log('test');
     console.log(msg.chat.id);
  });
  bot.onText(/^!описание(?:\s+@(\S+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAllowedChat(chatId)) return;
    console.log(chatId);

    // Если указан тег — берём его, иначе берём username автора сообщения
    const requestedUsername = match[1]
      ? `@${match[1]}`
      : msg.from.username
      ? `@${msg.from.username}`
      : null;
    console.log(requestedUsername);
    if (!requestedUsername) {
      return bot.sendMessage(chatId, '❗ У тебя не установлен username в Telegram.', {
        reply_to_message_id: msg.message_id,
      });
    }

    try {
      const player = await getPlayerDescription(requestedUsername, auth, SPREADSHEET_ID);

      if (!player) {
        return bot.sendMessage(chatId, `❌ Описание для ${requestedUsername} не найдено.`, {
          reply_to_message_id: msg.message_id,
        });
      }

      const response = `
📄 Описание игрока ${requestedUsername}:

👤 Имя: ${player.name}
🏷 Ник: ${player.nick}
🎮 PUBG ID: ${player.pubgId}
🎂 Возраст: ${player.age}
📍 Город: ${player.city}
      `.trim();

      bot.sendMessage(chatId, response, {
        reply_to_message_id: msg.message_id,
      });
    } catch (error) {
      bot.sendMessage(chatId, '❌ Произошла ошибка при получении описания.', {
        reply_to_message_id: msg.message_id,
      });
    }
  });
};
