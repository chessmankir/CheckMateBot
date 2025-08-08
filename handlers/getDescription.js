const getPlayerDescription = require('./../db/getDescriptionDb');
const isAllowedChat = require('./../admin/permissionChats');
module.exports = function (bot) {
  bot.onText(/^!описание(?:\s+@(\S+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAllowedChat(chatId)) return;
    // 1. Получаем тег или actor_id
    const requestedUsername = match[1]
      ? `@${match[1]}`
      : msg.from.username
      ? `@${msg.from.username}`
      : null;

    const actorId = msg.from.id;

    if (!requestedUsername) {
      return bot.sendMessage(chatId, '❗ У тебя не установлен username в Telegram.', {
        reply_to_message_id: msg.message_id,
      });
    }

    // 2. Запрашиваем данные из базы
    try {
      const player = await getPlayerDescription(requestedUsername || actorId.toString());

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
      console.error('Ошибка при получении описания из базы:', error);
      bot.sendMessage(chatId, '❌ Произошла ошибка при получении описания.', {
        reply_to_message_id: msg.message_id,
      });
    }
  });
};
