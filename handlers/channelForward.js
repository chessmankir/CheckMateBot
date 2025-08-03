module.exports = function (bot, FROM_CHANNEL_ID, TO_CHAT_ID) {
  bot.on('channel_post', async (msg) => {
    try {
      const messageId = msg.message_id;
      await bot.forwardMessage(TO_CHAT_ID, FROM_CHANNEL_ID, messageId);
    } catch (error) {
      console.error('Ошибка при форварде сообщения:', error);
    }
  });
};