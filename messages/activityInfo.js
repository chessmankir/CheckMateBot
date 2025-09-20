// modules/cmd.activity.js
const { getUserStats, getTopActive } = require('../handlers/activityTracker');

// простое экранирование для Markdown
function esc(s) {
  if (s === null || s === undefined) return '—';
  return String(s).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function formatWhen(ts) {
  if (!ts) return '—';
  const d = new Date(ts);

  // прибавляем 3 часа
  d.setHours(d.getHours() + 3);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}


module.exports = function (bot) {
  // !активность — для себя / реплая / @username (если юзер есть в чате)
  bot.onText(/^!активность(?:\s+@?([\w\d_]+))?$/iu, async (msg, match) => {
    const chatId = msg.chat.id;

    // 1) Кого смотрим
    let userId = msg.from.id;
    
    let title = `Ваша активность`;

    // если ответ на чужое сообщение — берём адресата
    if (msg.reply_to_message?.from?.id) {
      userId = msg.reply_to_message.from.id;
      if (msg.reply_to_message?.from?.id) {
        const u = msg.reply_to_message.from;
        userId = u.id;

        const name = [
          u.first_name || '',
          u.last_name || ''
        ].join(' ').trim();

        if (u.username) {
          title = `Активность ${name || ''} (@${u.username})`;
        } else {
          title = `Активность ${name || `ID ${userId}`}`;
        }
      }

    } else if (match[1]) {
      // если указали @username — попробуем получить через getChatMember (сработает, если он есть/был в чате)
      const uname = match[1].replace(/^@/, '');
      try {
        // Telegram API не даёт прямого поиска по @, обходимся кэшем чата:
        // если бот "видит" участника — вернётся объект; иначе бросит исключение
        const members = await bot.getChatAdministrators(chatId).catch(() => []);
        const hitAdmin = members.find(m => (m.user.username || '').toLowerCase() === uname.toLowerCase());
        if (hitAdmin) {
          userId = hitAdmin.user.id;
        } else {
          // как вариант — можно запросить getChatMember на сам @username, но API ждёт numeric id
          // поэтому предупредим:
          await bot.sendMessage(chatId, `Не удалось определить ID пользователя @${uname}. Ответьте на его сообщение командой !активность или позвольте боту «увидеть» его сообщение.`, { reply_to_message_id: msg.message_id });
          return;
        }
        title = `Активность @${uname}`;
      } catch (e) {
        await bot.sendMessage(chatId, `Не удалось определить пользователя @${uname}. Ответьте на его сообщение командой !активность.`, { reply_to_message_id: msg.message_id });
        return;
      }
    }

    // 2) Загружаем агрегаты
    const stats = await getUserStats(chatId, userId);

    const text = [
      `*${esc(title)}*`,
      `Последнее сообщение: ${esc(formatWhen(stats.lastMsgAt))}`,
      `За 7 дней: *${stats.week}*`,
      `За 30 дней: *${stats.month}*`,
      `За всё время: *${stats.total}*`,
    ].join('\n');

    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
  });

  // !топ7 — топ активных за 7 дней (можно !топ30)
  bot.onText(/^!топ(\d+)?$/iu, async (msg, match) => {
    const chatId = msg.chat.id;
    const days = Math.max(1, Math.min(90, Number(match[1] || 7))); // 1..90
    const rows = await getTopActive(chatId, days, 10);
    if (!rows.length) {
      return bot.sendMessage(chatId, `За последние ${days} дн. нет данных.`, { reply_to_message_id: msg.message_id });
    }

    // попробуем подтянуть имена через getChatMember (если доступны)
    const lines = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      let label = `ID ${r.user_id}`;
      try {
        const m = await bot.getChatMember(chatId, r.user_id);
        const u = m.user;
        label = u.username ? `@${u.username}` : `${u.first_name || ''} ${u.last_name || ''}`.trim() || label;
      } catch (_) {}
      lines.push(`${i+1}. ${label} — ${r.count}`);
    }

    await bot.sendMessage(chatId, `Топ за ${days} дн.:\n` + lines.join('\n'), {
      reply_to_message_id: msg.message_id
    });
  });
};
