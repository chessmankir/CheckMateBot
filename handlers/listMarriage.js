// modules/cmd.marriages.js
const pool = require('../handlers/db'); // 

function pad(n) { return n.toString().padStart(2, '0'); }

/**
 * Разница "месяцы / дни / часы" между now и started_at
 * Считаем "целые месяцы" календарно, затем остаток в днях и часах.
 */
function diffPretty(startDate) {
  const start = new Date(startDate);
  const now = new Date();

  // месяцы (календарно)
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  // если "день в месяце" ещё не достигнут — уменьшаем на 1 месяц
  const tmp = new Date(now.getFullYear(), now.getMonth(), start.getDate(), start.getHours(), start.getMinutes(), start.getSeconds());
  if (now < tmp) months = Math.max(0, months - 1);

  // дата после добавления целых месяцев
  const afterMonths = new Date(start);
  afterMonths.setMonth(afterMonths.getMonth() + months);

  // дни (целые)
  const msDay = 24 * 60 * 60 * 1000;
  let days = Math.floor((now - afterMonths) / msDay);
  if (days < 0) days = 0;

  // часы (остаток)
  const afterDays = new Date(afterMonths.getTime() + days * msDay);
  let hours = Math.floor((now - afterDays) / (60 * 60 * 1000));
  if (hours < 0) hours = 0;

  // сборка строки
  const chunks = [];
  if (months > 0) {
    const m = months % 10;
    const mm = months % 100;
    const word = (mm >= 11 && mm <= 14) ? 'месяцев'
      : (m === 1 ? 'месяц' : (m >= 2 && m <= 4 ? 'месяца' : 'месяцев'));
    chunks.push(`${months} ${word}`);
  }
  if (days > 0) chunks.push(`${days} дн`);
  if (hours > 0 && months === 0) chunks.push(`${hours} ч`); // часы показываем только если меньше месяца
  if (chunks.length === 0) chunks.push('менее часа');

  return chunks.join(' ');
}

/**
 * Формат @username или Имя Фамилия
 */
function formatName(row, side) {
  const u = side === 'a' ? row.a_username : row.b_username;
  const first = side === 'a' ? row.a_first_name : row.b_first_name;
  const last  = side === 'a' ? row.a_last_name  : row.b_last_name;

  if (u) return `${u}`;
  return [first || '', last || ''].join(' ').trim() || 'Безымянный';
}

module.exports = function marriagesCommand(bot) {
  bot.onText(/^!браки$/i, async (msg) => {
    const chatId = msg.chat.id;

    try {
      // 1) Тянем активные браки этого чата, старшие – первыми
      const { rows } = await pool.query(`
        SELECT m.id, m.started_at,
               ua.telegram_tag AS a_username, ua.name AS a_first_name,
               ub.telegram_tag AS b_username, ub.name AS b_first_name
        FROM marriages m
        JOIN clan_members ua ON ua.actor_id = m.partner_a_id
        JOIN clan_members ub ON ub.actor_id = m.partner_b_id
        WHERE m.chat_id = $1 AND m.ended_at IS NULL
        ORDER BY m.started_at ASC;            -- старые пары выше (как на скрине)
      `, [chatId]);

      if (!rows.length) {
        return bot.sendMessage(chatId, 'Пока нет браков в этом чате 💔');
      }

      // 2) Готовим строки
      const green = [];    // >= 1 мес
      const newly = [];    // < 1 мес
      for (const r of rows) {
        const left  = formatName(r, 'a');
        const right = formatName(r, 'b');
        const when  = diffPretty(r.started_at);
        const line  = `${left} + ${right} (${when})`;
        // критерий: 1 месяц и более — "зелёная"
        const mOld = (new Date().getFullYear() - new Date(r.started_at).getFullYear()) * 12
                   + (new Date().getMonth() - new Date(r.started_at).getMonth());
        // уточним календарно (как в diffPretty)
        const start = new Date(r.started_at);
        const now = new Date();
        const tmp = new Date(now.getFullYear(), now.getMonth(), start.getDate(), start.getHours(), start.getMinutes(), start.getSeconds());
        const months = now < tmp ? Math.max(0, mOld - 1) : mOld;

        if (months >= 1) green.push(line); else newly.push(line);
      }

      // 3) Собираем сообщение
      let text = '💍 *Браки этого чата*\n\n';
      if (green.length) {
        text += '🌿 *Зелёная свадьба*\n';
        green.forEach((l, i) => { text += `${i + 1}. ${l}\n`; });
        text += '\n';
      }
      if (newly.length) {
        text += '🦁 *Молодожёны*\n';
        const startIdx = green.length ? green.length + 1 : 1;
        newly.forEach((l, i) => { text += `${startIdx + i}. ${l}\n`; });
        text += '\n';
      }
      text += '💬 Чтобы вступить в брак с участником чата, введите команду `брак @юзер`.';

      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }, {
                               reply_to_message_id: msg.message_id
                             }
                           );
    } catch (e) {
      console.error('!браки error', e);
      bot.sendMessage(chatId, 'Произошла ошибка при получении браков 😿',{
                         reply_to_message_id: msg.message_id
                       }
                     );
    }
  });
};
