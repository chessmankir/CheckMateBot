const fs = require('fs');
const path = './data/clan_members.json';

function loadDescriptions() {
  if (fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path));
  }
  return [];
}

module.exports = function (bot, usernameMap) {
  bot.onText(/!описание\s+@(\w+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const tag = '@' + match[1];
    const data = loadDescriptions();

    // 1. Получаем actor_id, если знаем
    const actor_id = usernameMap.get(tag);
    let entry = null;

    // 2. Пытаемся найти по actor_id
    if (actor_id) {
      entry = data.find(item => item.actor_id?.toString() === actor_id.toString());
    }

    // 3. Если не нашли — ищем по target_username
    if (!entry) {
      entry = data.find(item => item.target_username?.toLowerCase() === tag.toLowerCase());
    }
    
    if (!entry) {
      bot.sendMessage(chatId, `❌ Описание не найдено для ${tag}`);
      return;
    }

    const text = `
📄 <b>Описание игрока ${entry.target_username}</b>

👤 <b>Имя:</b> ${entry.name}
🎮 <b>Ник:</b> ${entry.nickname}
🆔 <b>PUBG ID:</b> ${entry.pubg_id}
🎂 <b>Возраст:</b> ${entry.age}
🏙 <b>Город:</b> ${entry.city}`;

    bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
  });
};
