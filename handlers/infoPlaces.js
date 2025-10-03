// modules/cmd.places.js
const db = require('../handlers/db');
const isAllowedChat = require('../admin/permissionChats');


// Текущие лимиты кланов
const clanLimits = {
  1: 55,
  2: 60,
  3: 60,
  4: 40
};

module.exports = function (bot) {
  bot.onText(/^!места$/iu, async (msg) => {
    const chatId = msg.chat.id;
    // if (!isAllowedChat(chatId)) return;

    try {
      // Считаем активных по каждому клану
      const res = await db.query(
        `SELECT clan, COUNT(*)::int AS count
         FROM public.clan_members
         WHERE active = TRUE
         GROUP BY clan`
      );

      // Перегоняем в map
      const counts = {};
      res.rows.forEach(row => {
        counts[row.clan] = row.count;
      });

      // Формируем вывод по порядку
      const lines = Object.keys(clanLimits).sort((a, b) => a - b).map(clan => {
        const active = counts[clan] || 0;
        const limit = clanLimits[clan];
        return `♟ Клан ${clan}: ${active}/${limit}`;
      });
      
      const total = Object.values(clanLimits).reduce((sum, v) => sum + v, 0);
      const used = Object.keys(counts).reduce((sum, clan) => sum + (counts[clan] || 0), 0);
      const free = total - used;

      // добавляем в конец
      lines.push(`🪑 Свободно: ${free}`);
      lines.push(`👥 Всего: ${total}`);
      await bot.sendMessage(chatId, lines.join('\n'), {
        reply_to_message_id: msg.message_id
      });

    } catch (err) {
      console.error('Ошибка в !места:', err);
      await bot.sendMessage(chatId, '❌ Не удалось получить места по кланам.', {
        reply_to_message_id: msg.message_id
      });
    }
  });
};
