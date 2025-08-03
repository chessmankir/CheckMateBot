const ALLOWED_CHAT_IDS = [
  -1002303001603, // ID первого 
  -1002549710535, // ID второго чата
  -1002833167359  // ID третьего чата
];

const adminChat = "-1002303001603";

function isAllowedChat(chatId) {
  return ALLOWED_CHAT_IDS.includes(chatId);
}

module.exports = isAllowedChat;

/*function isAdminChat(chatId) {
  return adminChat === chatId;
} */