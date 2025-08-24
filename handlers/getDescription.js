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

module.exports = function (bot) {
  // реагирует на "описание" (без восклицательного знака по твоему коду)
  bot.onText(/^описание(?:\s+@(\S+))?$/iu, async (msg, match) => {
    const chatId = msg.chat.id;
    // if (!isAllowedChat(chatId)) return;

    try {
      const explicitTag = match[1] ? `@${match[1]}` : null;

      const replied = msg.reply_to_message || null;
      const author  = msg.from;

      // Ветка/форум даёт "ложный реплай" к шапке темы.
      // Считаем реплаем только если это НЕ шапка/сервисное и не бот.
      const isRealReply =
        !!replied &&
        !replied.is_topic_message &&
        !replied.forum_topic_created &&
        !replied.sender_chat &&                       // на всякий случай, если ответ на канал
        replied.from && !replied.from.is_bot &&
        replied.message_id !== msg.message_thread_id; // часто шапка имеет id = thread_id

      let actorId = null;
      let requestedUsername = null;

      if (isRealReply) {
        // есть реальный реплай
        if (explicitTag) {
          requestedUsername = explicitTag;            // явный @ важнее
        } else {
          actorId = replied.from.id;                  // ищем по id того, на кого ответили
          requestedUsername = replied.from.username
            ? `@${replied.from.username}`
            : null;
        }
      } else {
        // реплая нет (или он "ложный")
        if (explicitTag) {
          requestedUsername = explicitTag;            // ищем по явному @
        } else {
          actorId = author.id;                        // иначе по автору команды
          requestedUsername = author.username
            ? `@${author.username}`
            : null;
        }
      }

      if (!requestedUsername && !actorId) {
        return bot.sendMessage(
          chatId,
          '❗ У пользователя нет username. Укажи @username явно: `!описание @user`',
          { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' }
        );
      }

      const key = actorId ? String(actorId) : requestedUsername;
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
