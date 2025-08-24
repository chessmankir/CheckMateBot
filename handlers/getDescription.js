// modules/cmd.description.js
// helper: реальный ли реплай человеку, а не шапке/боту/каналу

const getPlayerDescription = require('./../db/getDescriptionDb');
const isAllowedChat = require('./../admin/permissionChats');

function escapeMarkdown(text) {
  if (!text) return '—';
  return text
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/`/g, '\\`')
    .replace(/\[/g, '\\[');
}


function isRealUserReply(msg) {
  const r = msg.reply_to_message;
  if (!r) return false;
  if (!r.from || r.from.is_bot) return false;          // не бот
  if (r.is_topic_message || r.forum_topic_created) return false; // шапка/сервиска
  if (r.sender_chat) return false;                      // ответ на канал/чат, не на юзера
  if (typeof msg.message_thread_id === 'number' && r.message_id === msg.message_thread_id) {
    // многие клиенты ставят reply на "шапку" с id == thread_id
    return false;
  }
  return true;
}

module.exports = function (bot) {
  bot.onText(/^описание(?:\s+@(\S+))?$/iu, async (msg, match) => {
    const chatId = msg.chat.id;
    try {
      const explicitTag = match[1] ? `@${match[1]}` : null;
      const repliedUser = msg.reply_to_message?.from || null;
      const author = msg.from;

      const realReply = isRealUserReply(msg);

      let actorId = null;
      let requestedUsername = null;

      if (explicitTag) {
        // явный тег — всегда приоритет для поиска по username
        requestedUsername = explicitTag;
      } else if (realReply) {
        // реальный ответ пользователю — приоритет actorId адресата
        actorId = repliedUser.id;
        requestedUsername = repliedUser.username ? `@${repliedUser.username}` : null;
      } else {
        // нет реплая — берём автора
        actorId = author.id;
        requestedUsername = author.username ? `@${author.username}` : null;
      }

      if (!requestedUsername && !actorId) {
        return bot.sendMessage(
          chatId,
          '❗ У пользователя нет username. Укажи @username явно: `!описание @user`',
          { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' }
        );
      }

      const key = actorId ? String(actorId) : requestedUsername; // приоритет actorId
      const player = await getPlayerDescription(key);

      if (!player) {
        return bot.sendMessage(
          chatId,
          `❌ Описание для ${requestedUsername || `ID ${actorId}`} не найдено.`,
          { reply_to_message_id: msg.message_id }
        );
      }

      const pubgId = player.pubgId != null ? String(player.pubgId) : '';
      const text = `
🧾 Описание игрока ${escapeMarkdown(requestedUsername || `ID ${actorId}`)}:

👤 Имя: ${escapeMarkdown(player.name)}
🏷 Ник: ${escapeMarkdown(player.nick)}
🎮 PUBG ID: \`${escapeMarkdown(pubgId) || '—'}\`
🎂 Возраст: ${escapeMarkdown(player.age)}
📍 Город: ${escapeMarkdown(player.city)}
      `.trim();

      await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_to_message_id: msg.message_id,
        reply_markup: {
          inline_keyboard: pubgId
            ? [[{ text: '📋 Скопировать PUBG ID', copy_text: { text: pubgId } }]]
            : []
        }
      });
    } catch (error) {
      console.error('Ошибка при получении описания из базы:', error);
      bot.sendMessage(chatId, '❌ Произошла ошибка при получении описания.', {
        reply_to_message_id: msg.message_id
      });
    }
  });
};
