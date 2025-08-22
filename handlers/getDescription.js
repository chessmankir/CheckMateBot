const getPlayerDescription = require('./../db/getDescriptionDb');
const isAllowedChat = require('./../admin/permissionChats');

module.exports = function (bot) {
  // реагирует на "!описание", "!Описание", "!ОПИСАНИЕ" и т.п.
  bot.onText(/^!описание(?:\s+@(\S+))?$/iu, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAllowedChat(chatId)) return;

    try {
      // 1) Явно указанный @ в команде
      const explicitTag = match[1] ? `@${match[1]}` : null;

      // 2) Если команда в ответ — берём пользователя из reply
      const repliedUser = msg.reply_to_message?.from || null;

      // 3) Автор команды
      const author = msg.from;

      // приоритет: @в команде -> reply -> автор
      const requestedUsername =
        explicitTag ||
        (repliedUser?.username ? `@${repliedUser.username}` : null) ||
        (author?.username ? `@${author.username}` : null);

      // если нет username — будем искать по actor_id (reply -> автор)
      const actorId = explicitTag ? null : (repliedUser?.id ?? author?.id) || null;

      if (!requestedUsername && !actorId) {
        return bot.sendMessage(
          chatId,
          '❗ У пользователя нет username. Укажи @username явно: `!описание @user`',
          { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' }
        );
      }

      // Ключ для поиска в БД
      const key = requestedUsername || String(actorId);
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
🧾 Описание игрока ${requestedUsername || `ID ${actorId}`}:

👤 Имя: ${player.name ?? '—'}
🏷 Ник: ${player.nick ?? '—'}
🎮 PUBG ID: \`${pubgId || '—'}\`
🎂 Возраст: ${player.age ?? '—'}
📍 Город: ${player.city ?? '—'}
      `.trim();

      await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_to_message_id: msg.message_id,
        reply_markup: {
          // кнопку показываем только если есть что копировать
          inline_keyboard: pubgId
            ? [[{ text: '📋 Скопировать PUBG ID', copy_text: { text: pubgId } }]]
            : []
        }
      }); // ← вот этого закрытия у тебя не хватало

    } catch (error) {
      console.error('Ошибка при получении описания из базы:', error);
      bot.sendMessage(chatId, '❌ Произошла ошибка при получении описания.', {
        reply_to_message_id: msg.message_id
      });
    }
  });
};

