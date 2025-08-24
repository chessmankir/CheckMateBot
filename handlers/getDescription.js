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
  // реагирует на "!описание", "!Описание", "!ОПИСАНИЕ" и т.п.
  bot.onText(/^описание(?:\s+@(\S+))?$/iu, async (msg, match) => {
    const chatId = msg.chat.id;
    // if (!isAllowedChat(chatId)) return;

    try {
      // 1) Явно указанный @ в команде
      const explicitTag = match[1] ? `@${match[1]}` : null;

      // 2) Если команда в ответ — берём пользователя из reply
      const repliedUser = msg.reply_to_message?.from || null;

      // 3) Автор команды
      const author = msg.from;

      // --- Приоритет: actorId ---
      const actorId = repliedUser?.id ?? author?.id ?? null;

      // Если actorId нет — fallback на username/explicitTag
      const requestedUsername =
        actorId
          ? null
          : explicitTag ||
            (repliedUser?.username ? `@${repliedUser.username}` : null) ||
            (author?.username ? `@${author.username}` : null);

      if (!requestedUsername && !actorId) {
        return bot.sendMessage(
          chatId,
          '❗ У пользователя нет username. Укажи @username явно: `!описание @user`',
          { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' }
        );
      }

      console.log('requestedUsername:', requestedUsername);

      // Ключ для поиска в БД: сначала actorId, потом username
      const key = actorId ? String(actorId) : requestedUsername;
      console.log('DB key:', key);

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

