const db = require('./db');
const isAllowedChat = require('../admin/permissionChats');

const ALLOWED_CHAT_IDS = [
  -1002549710535, // ID превого чата
  -1002833167359  // ID второго чата
];

module.exports = function (bot) {
  bot.onText(/!разбан1\s+@(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    console.log('разюан');
    if (!isAllowedChat(chatId)) return;
    console.log('allowed');
    const tag = `@${match[1]}`.toLowerCase();

    try {
      // Ищем участника по @тегу
      const res = await db.query(
        'SELECT * FROM clan_members WHERE lower(telegram_tag) = $1',
        [tag]
      );

      if (res.rowCount === 0) {
        return bot.sendMessage(chatId, `❌ Участник ${tag} не найден.`);
      }

      const member = res.rows[0];

      const targetChatId = (res.rows[0].clan === 3 || res.rows[0].clan === 4)? ALLOWED_CHAT_IDS[1] : ALLOWED_CHAT_IDS[0];
      // Обновляем в базе
      await db.query(
        'UPDATE clan_members SET active = TRUE WHERE lower(telegram_tag) = $1',
        [tag]
      );

      // Если есть actor_id — снимаем бан в чате
      if (member.actor_id) {
        await bot.unbanChatMember(targetChatId, member.actor_id);
        await bot.sendMessage(chatId, `✅ ${tag} разбанен и активирован.`, {
                                reply_to_message_id: msg.message_id,
                              }
                             );
      } else {
        await bot.sendMessage(chatId, `✅ ${tag} активирован в базе, id не найден для разбана в чате.`,  {
                                reply_to_message_id: msg.message_id,
                              }
                             );
      }

    } catch (err) {
      console.error('Ошибка при разбане:', err);
      bot.sendMessage(chatId, '❌ Произошла ошибка при попытке разбана.', {
                        reply_to_message_id: msg.message_id,
                      }
                     );
    }
  });
};
