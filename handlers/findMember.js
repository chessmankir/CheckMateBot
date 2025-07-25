const fs = require('fs');
const path = './data/clan_members.json';

function loadDescriptions() {
  if (fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path));
  }
  return [];
}

module.exports = function (bot) {
  bot.onText(/!поиск\s+(.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1].trim();

    const data = loadDescriptions();
    let entry = null;

    if (/^\d+$/.test(query)) {
      // 🔍 Поиск по PUBG ID
      entry = data.find(item => item.pubg_id === query);
    } else {
      // 🔍 Поиск по никнейму (без учёта регистра)
      entry = data.find(item => item.nickname?.toLowerCase() === query.toLowerCase());
    }

    if (!entry) {
      bot.sendMessage(chatId, `❌ Игрок с таким значением "${query}" не найден.`);
      return;
    }

    const text = `
📄 <b>Описание игрока ${entry.target_username} </b>

👤 <b>Имя:</b> ${entry.name}
🎮 <b>Ник:</b> ${entry.nickname}
🆔 <b>PUBG ID:</b> ${entry.pubg_id}
🎂 <b>Возраст:</b> ${entry.age}
🏙 <b>Город:</b> ${entry.city}
`.trim();

    bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
  });
};
