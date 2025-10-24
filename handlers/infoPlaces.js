// modules/cmd.places.js
const db = require('../handlers/db');
const isAdminChat = require('../admin/permissionAdminChat');
const getClanId = require('../clan/getClanId');
const getClanLimits = require('../clan/getClanLimits');

// Текущие лимиты кланов

module.exports = function (bot) {
  bot.onText(/^!места$/iu, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdminChat(chatId)) return;

    try {
      // Считаем активных по каждому клан
      
      const clanId = await getClanId(chatId );
      const clanLimits = await getClanLimits(chatId );
      console.log('success');
      console.log(clanId);
      // 2) Считаем активных по каждому ВНУТРЕННЕМУ клану внутри этого clan_id
      const res = await db.query(
        `SELECT clan, COUNT(*)::int AS count
           FROM public.clan_members
          WHERE active = TRUE
            AND clan_id = $1
          GROUP BY clan`,
        [clanId]
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
      
      const total = Object.values(counts).reduce((sum, v) => sum + v, 0);
      const alltotal = Object.values(clanLimits).reduce((sum, v) => sum + v, 0);
      const used = Object.keys(counts).reduce((sum, clan) => sum + (counts[clan] || 0), 0);
      const free = alltotal - used;

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
