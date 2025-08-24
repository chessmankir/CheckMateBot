const db = require('./db');
const isAllowedChat = require('../admin/permissionChats');
const isAdminChat = require('../admin/permissionAdminChat');

module.exports = function (bot) {

  // !списокN — участников определённого клана
  bot.onText(/!баны/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdminChat(chatId)) return;
    try {
      const res = await db.query(
        'SELECT telegram_tag, nickname, created_at FROM clan_members WHERE active = FALSE ORDER BY telegram_tag'
      );

      if (res.rows.length === 0) {
        return bot.sendMessage(chatId, `❗️Нет банов`, {
          reply_to_message_id: msg.message_id
        });
      }

      const members = res.rows;

      // сортировка по дате создания (от старых к новым)
      members.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      const now = new Date();

      const lines = members.map((m, i) => {
        const createdAt = new Date(m.created_at);

        // разница в днях
        const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

        return `${i + 1}. ${m.telegram_tag || '(без тега)'} — ${m.nickname || '(без ника)'} — ${diffDays} дн.`;
      });


      const message = `Список забаненных клана Checkmate:\n\n${lines.join('\n')}`;

      bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });

    } catch (err) {
      console.error('❌ Ошибка при получении списка забаненных:', err);
      bot.sendMessage(chatId, '❌ Ошибка при получении списка.', { reply_to_message_id: msg.message_id });
    }
  });
  
};