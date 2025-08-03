require('dotenv').config(); // Загружает переменные из .env
const adminChat = process.env.ADMIN_CHAT;

function isAdminChat(chatId) {
  console.log(chatId);
  console.log(adminChat == chatId);
  return adminChat == chatId;
} 

module.exports = isAdminChat;