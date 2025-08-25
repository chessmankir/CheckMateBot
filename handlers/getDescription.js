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

// реальный ли реплай пользователю (а не шапке/боту/каналу)
function isRealUserReply(msg) {
  const r = msg.reply_to_message;
  console.log(r);
  if (!r) return false;
  console.log('1');
  if (!r.from || r.from.is_bot) return false;          // не бот
  console.log('2');
/*  if (r.is_topic_message || r.forum_topic_created) return false; */
  console.log('3');
  if (r.sender_chat) return false;                      // ответ на канал/чат
  console.log('4');
  /*if (typeof msg.message_thread_id === 'number' && r.message_id === msg.message_thread_id) {
    console.log('5');
    // многие клиенты ставят reply на «шапку» с id == thread_id
    return false;
  }*/
  return true;
}

module.exports = function (bot) {
  bot.onText(/^описание(?:\s+@(\S+))?$/iu, async (msg, match) => {
    const chatId = msg.chat.id;
    // if (!isAllowedChat(chatId)) return;

    try {
      const explicitTag = match[1] ? `@${match[1]}` : null;
      const author = msg.from;

      let actorId = null;            // ключ №1
      let requestedUsername = null;  // ключ №2 (если нет actorId)

      // 1) Явный @ всегда можно указать
      if (explicitTag) {
        console.log('explicitTag');
        requestedUsername = explicitTag;
      } else if (isRealUserReply(msg)) {
        console.log('isRealUserReply');
        // 2) Реальный реплай — берём id адресата
        actorId = msg.reply_to_message.from.id;
      } else {
        // 3) Реплая нет — берём автора команды
        console.log('actor');
        actorId = author?.id ?? null;
      }
      
      if (!requestedUsername && !actorId) {
        return bot.sendMessage(
          chatId,
          '❗ У пользователя нет username. Укажи @username явно: `!описание @user`',
          { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' }
        );
      }

      // Ключ поиска: приоритет actorId
      const key = actorId ? String(actorId) : requestedUsername;
      console.log(key);
      const player = await getPlayerDescription(key);

      if (!player) {
        return bot.sendMessage(
          chatId,
          `❌ Описание для ${requestedUsername || `ID ${actorId}`} не найдено.`,
          { reply_to_message_id: msg.message_id }
        );
      }

      const pubgId = player.pubgId != null ? String(player.pubgId) : '';
      // что показывать в заголовке (если искали по ID — показываем ID)
      const subjectForText = actorId ? `ID ${actorId}` : requestedUsername;

      const text = `
🧾 Описание игрока ${escapeMarkdown(subjectForText)}:

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
