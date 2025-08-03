const saveDescription = require('./saveDescriptionFunc');
const isAdminChat = require('./../admin/permissionAdminChat');

// 📬 Обработчик команды "+описание1 @ник"
module.exports = function (bot) {
  bot.onText(/^\+описание1\s+@(\S+)\n(.+)/s, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdminChat(chatId)) return;
    const from = msg.from;
    const target_username = `@${match[1]}`;
    const lines = match[2].trim().split('\n');
    console.log('description');
    if (lines.length < 6) {
      return bot.sendMessage(chatId, '❌ Не хватает данных. Нужно 6 строк после ника.', {
        reply_to_message_id: msg.message_id,
      });
    }
    
    const data = {
      name: lines[0],  
      nick: lines[1],
      pubg_id: lines[2],
      target_username,  
      age: lines[3],
      city: lines[4],
      clan: lines[5],
      actor_id: '',
      date: Date.now()
    };
    console.log(data);
    await saveDescription(data);

    bot.sendMessage(chatId, `✅ Описание для ${target_username} сохранено.`, {
      reply_to_message_id: msg.message_id,
    });
  });
};
