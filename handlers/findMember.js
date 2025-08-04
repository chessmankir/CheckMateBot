const db = require('../handlers/db'); // путь к подключению к базе
const isAllowedChat = require('../admin/permissionChats');

module.exports = function (bot) {
  bot.onText(/!поиск\s+(.+)/i, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAllowedChat(chatId)) return;

    const query = match[1].trim().toLowerCase();

    try {
      const res = await db.query(
        `SELECT * FROM clan_members 
         WHERE LOWER(telegram_tag) = $1 
         OR CAST(pubg_id AS TEXT) = $1 
         OR LOWER(nickname) = $1
         LIMIT 1`,
        [query]
      );

      if (res.rows.length === 0) {
        return bot.sendMessage(chatId, `❌ Участник по запросу "${query}" не найден.`, {
          reply_to_message_id: msg.message_id
        });
      }

      const user = res.rows[0];

      const message = `
📄 Найден участник: ${user.telegram_tag || '(нет тега)'}

👤 Имя: ${user.name || '(нет имени)'}
🧾 Ник: ${user.nickname || '(нет ника)'}
🆔 PUBG ID: ${user.pubg_id || '(нет PUBG ID)'}
📅 Возраст: ${user.age || '(не указан)'}
📍 Город: ${user.city || '(не указан)'}
🏰 Клан: ${user.clan || '(не указан)'}
      `.trim();

      bot.sendMessage(chatId, message, {
        reply_to_message_id: msg.message_id
      });

    } catch (err) {
      console.error('❌ Ошибка при поиске в базе:', err);
      bot.sendMessage(chatId, '❌ Произошла ошибка при поиске участника.', {
        reply_to_message_id: msg.message_id
      });
    }
  });
};

