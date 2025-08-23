// modules/onNewMember.js
module.exports = function (bot) {
  bot.on('new_chat_members', async (msg) => {
    const chatId = msg.chat.id;

    for (const user of msg.new_chat_members) {
      // Собираем имя
      const name = user.username
        ? `@${user.username}`
        : [user.first_name, user.last_name].filter(Boolean).join(' ');

      // Текст приветствия
      const text = `
<b>Приветствие:</b>
Добро пожаловать, ${name}, в нашу семью!
Ознакомься с правилами — напиши "Правила" в чат,
соблюдай их и будь просто лапочкой! 💖🤗
      `;

      try {
        await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
      } catch (err) {
        console.error('Ошибка приветствия:', err);
      }
    }
  });
};