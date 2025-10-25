const handleChannelForward = require("../handlers/channelForward");
const getAllChats = require("../clan/getAllChats");

module.exports = async function (bot) {
  try {
    // Получаем список всех чатов
    const allChats = await getAllChats();

    // Проходимся по каждому чату
     const nameTgk = "@winepubgm";
  //  const nameTgk = "@prikolforward";
    for (const chat of allChats) {
      const chatId = chat.chat_id || chat.id || chat;
      try {
        await handleChannelForward(bot, nameTgk, chatId);
      } catch (err) {
        console.error(`⚠️ Ошибка при репосте в ${chatId}:`, err.message);
      }
    }
  } catch (err) {
    console.error("❌ Ошибка при получении чатов:", err);
  }
};
