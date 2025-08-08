const db = require('./db'); // подключение к PostgreSQL

const isAdminChat = require('../admin/permissionAdminChat');
const isAllowedChat = require('./../admin/permissionChats');

module.exports = function (bot) {
  // !+правила1 <текст>
  bot.onText(/^!\+правила1\s+([\s\S]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1].trim();

    if (!isAdminChat(chatId)) return;

    if (!text) {
      return bot.sendMessage(chatId, '❌ Вы не указали текст правил.');
    }

    try {
      await db.query(
        `INSERT INTO rules (id, content)
         VALUES (1, $1)
         ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content`,
        [text]
      );

      bot.sendMessage(chatId, '✅ Правила успешно сохранены или обновлены.', {
                        reply_to_message_id: msg.message_id,
                      } );
    } catch (err) {
      console.error('Ошибка при сохранении правил:', err);
      bot.sendMessage(chatId, '❌ Ошибка при сохранении правил.',   {
                       reply_to_message_id: msg.message_id,
                     });
    }
  });

  // !правила1
  bot.onText(/^!правила1$/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAllowedChat(chatId)) return

    try {
      const result = await db.query(`SELECT content FROM rules WHERE id = 1`);

      if (result.rowCount === 0) {
        return bot.sendMessage(chatId, 'ℹ️ Правила ещё не добавлены.',  {
                                reply_to_message_id: msg.message_id,
                              });
      }

      const rulesText = result.rows[0].content;
      bot.sendMessage(chatId, `📜 Правила:\n\n${rulesText}`,  {
                       reply_to_message_id: msg.message_id,
                     });
    } catch (err) {
      console.error('Ошибка при получении правил:', err);
      bot.sendMessage(chatId, '❌ Ошибка при получении правил.',  {
                       reply_to_message_id: msg.message_id,
                     });
    }
  });
};
