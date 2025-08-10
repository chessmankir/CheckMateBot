const db = require('./db');
const isAllowedChat = require('../admin/permissionChats');

const clanLimits = {
  1: 50,
  2: 55,
  3: 60
};

module.exports = function (bot) {

  // !списокN — участников определённого клана
  bot.onText(/!список(\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const clanNumber = parseInt(match[1]);
    if (!isAllowedChat(chatId)) return;

    if (!clanLimits[clanNumber]) {
      return bot.sendMessage(chatId, '❌ Неверный номер клана.', {
        reply_to_message_id: msg.message_id
      });
    }

    try {
      const res = await db.query(
        'SELECT telegram_tag FROM clan_members WHERE clan = $1 AND active = TRUE ORDER BY telegram_tag',
        [clanNumber]
      );

      if (res.rows.length === 0) {
        return bot.sendMessage(chatId, `❗️В клане ${clanNumber} пока нет участников.`, {
          reply_to_message_id: msg.message_id
        });
      }

      const members = res.rows;
      const lines = members.map((m, i) => `${i + 1}. ${m.telegram_tag || '(без тега)'}`);
      const message = `Список участников клана Checkmate ${clanNumber} — ${members.length}/${clanLimits[clanNumber]}:\n\n${lines.join('\n')}`;

      bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });

    } catch (err) {
      console.error('❌ Ошибка при получении списка клана:', err);
      bot.sendMessage(chatId, '❌ Ошибка при получении списка.', { reply_to_message_id: msg.message_id });
    }
  });

  // !полныйсписок — всех участников
  bot.onText(/!полныйсписок/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAllowedChat(chatId)) return;

    try {
      const res = await db.query(
        'SELECT telegram_tag, clan FROM clan_members WHERE active = TRUE ORDER BY clan, telegram_tag'
      );

      if (res.rows.length === 0) {
        return bot.sendMessage(chatId, '❗️Список участников пуст.', {
          reply_to_message_id: msg.message_id
        });
      }

      const lines = res.rows.map((row, index) => {
        const tag = row.telegram_tag || '(без тега)';
        const clan = row.clan || '—';
        return `${index + 1}. ${tag} — клан ${clan}`;
      });

      const message = `Полный список участников:\n\n${lines.join('\n')}`;
      bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });

    } catch (err) {
      console.error('❌ Ошибка при получении полного списка:', err);
      bot.sendMessage(chatId, '❌ Ошибка при получении полного списка.', {
        reply_to_message_id: msg.message_id
      });
    }
  });
};
