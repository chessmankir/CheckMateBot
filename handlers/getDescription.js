// modules/cmd.description.js
const pool = require('../handlers/db');

// экранирование для HTML
function esc(s = '') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// универсальный селект по @тегу или actor_id
async function loadPlayer(client, { tag, actorId }) {
  // если есть @тег — пробуем сначала по нему
  if (tag) {
    const byTag = await client.query(`
      SELECT name, nickname, pubg_id, age, city, telegram_tag, actor_id
      FROM clan_members
      WHERE telegram_tag = $1
      ORDER BY id DESC
      LIMIT 1
    `, [tag]);
    if (byTag.rows.length) return byTag.rows[0];
  }
  // фолбэк: по actor_id
  if (actorId) {
    const byId = await client.query(`
      SELECT name, nickname, pubg_id, age, city, telegram_tag, actor_id
      FROM clan_members
      WHERE actor_id = $1
      ORDER BY id DESC
      LIMIT 1
    `, [actorId]);
    if (byId.rows.length) return byId.rows[0];
  }
  return null;
}

module.exports = function (bot) {
  // реагирует на "описание" или "!описание" + опционально @тег
  bot.onText(/^!?описани[её](?:\s+@(\S+))?$/iu, async (msg, match) => {
    const chatId = msg.chat.id;

    // 1) явно указанный @тег
    const explicitTag = match[1] ? `@${match[1]}` : null;

    // 2) если это ответ на сообщение — берём того, на кого ответили
    const repliedUser = msg.reply_to_message?.from || null;

    // 3) автор команды (как последний приоритет)
    const author = msg.from;

    // собираем цель
    const target = {
      tag: explicitTag
        || (repliedUser?.username ? `@${repliedUser.username}` : null)
        || (author?.username ? `@${author.username}` : null),
      actorId: explicitTag
        ? null                                  // если явный тег — actorId не обязателен
        : (repliedUser?.id ?? author?.id ?? null)
    };

    if (!target.tag && !target.actorId) {
      return bot.sendMessage(chatId, '❗️Не удалось определить пользователя (нет username и actor_id).');
    }

    const client = await pool.connect();
    try {
      const player = await loadPlayer(client, target);
      if (!player) {
        return bot.sendMessage(chatId, '❌ Описание не найдено.', {
          reply_to_message_id: msg.message_id
        });
      }

      // сборка карточки
      const title = `🧾 Описание игрока ${esc(player.telegram_tag || '')}:`;
      const lines = [
        `👤 Имя: ${esc(player.name || '—')}`,
        `🏷️ Ник: ${esc(player.nickname || '—')}`,
        `🎮 PUBG ID: ${esc(player.pubg_id || '—')}`,
        `🎂 Возраст: ${esc(player.age != null ? String(player.age) : '—')}`,
        `📍 Город: ${esc(player.city || '—')}`,
      ];

      const text = `${title}\n\n${lines.join('\n')}`;

      await bot.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id,
      });
    } catch (e) {
      console.error('!описание error:', e);
      bot.sendMessage(chatId, '❌ Ошибка при получении описания.', {
        reply_to_message_id: msg.message_id
      });
    } finally {
      client.release();
    }
  });
};
