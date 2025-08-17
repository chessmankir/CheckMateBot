const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const isAllowedChat = require('../admin/permissionChats');

function generateCode() {
  return 'CLAN-' + Math.floor(100000 + Math.random() * 900000);
}

module.exports = function(bot) {
  bot.onText(/!инвайт(\d+)/, async (msg, match) => {
    const clanNumber = parseInt(match[1]);

    if (isNaN(clanNumber)) {
      return bot.sendMessage(msg.chat.id, '❗ Укажи номер клана: !инвайт1, !инвайт2 и т.д.', {
        reply_to_message_id: msg.message_id,
      });
    }

    const inviteCode = generateCode();

    try {
      await db.query(
        'INSERT INTO invites (id, invite_code, is_active, clan_name) VALUES ($1, $2, $3, $4)',
        [uuidv4(), inviteCode, true, clanNumber]
      );

      bot.sendMessage(msg.chat.id, `🎟️ Инвайт-код для клана №${clanNumber}:`, {
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id,
      });
      
      bot.sendMessage(msg.chat.id, `<code>${inviteCode}</code>`, {
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id,
      });

    } catch (err) {
      console.error('Ошибка при сохранении инвайта:', err.message);
      bot.sendMessage(msg.chat.id, '❗ Ошибка при создании инвайта.', {
        reply_to_message_id: msg.message_id,
      });
    }
  });
};
