module.exports = function (bot, FROM_CHANNEL_ID, TO_CHAT_ID, clan_id) {
  bot.on('channel_post', async (msg) => {
    try {
      const text = msg.text || msg.caption || ''; // текст поста или подпись к фото
      // Проверяем наличие тега
      if (/#winenews/i.test(text)) {
      //  console.log(clan_id);
        return;
      }
      else{
        const messageId = msg.message_id;
        try{
          await bot.forwardMessage(TO_CHAT_ID, FROM_CHANNEL_ID, messageId);
        }
        catch{
          
        }
      }
    } catch (error) {
      //console.log(TO_CHAT_ID);
      console.error('Ошибка при форварде сообщения:', error);
    }
  });
};