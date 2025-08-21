module.exports = function (bot) {
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    console.log(`💬 Chat ID: ${chatId}`);
  });
};