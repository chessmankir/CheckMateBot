const fs = require('fs');
const path = './data/clan_members.json';

function loadDescriptions() {
  if (fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path));
  }
  return [];
}

function saveOrUpdateDescription(newEntry) {
  let data = loadDescriptions();

  let index = -1;

  if (newEntry.actor_id) {
    // 1. Если есть actor_id — ищем по нему
    index = data.findIndex(entry => entry.actor_id === newEntry.actor_id);
    if (index !== -1) {
      // Обновляем, даже если тег изменился — заменяем на новый
      data[index] = {
        ...data[index],
        ...newEntry,
        target_username: newEntry.target_username, // обновляем тег
        updated_at: new Date().toISOString()
      };
    }
  }

  if (index === -1 && newEntry.target_username) {
    // 2. Если не нашли по actor_id или actor_id = null — ищем по тегу
    index = data.findIndex(entry =>
      entry.target_username?.toLowerCase() === newEntry.target_username.toLowerCase()
    );

    if (index !== -1) {
      // Обновляем по тегу
      data[index] = {
        ...data[index],
        ...newEntry,
        updated_at: new Date().toISOString()
      };
    }
  }

  if (index === -1) {
    // 3. Не нашли ни по actor_id, ни по тегу — добавляем нового
    console.log(data);
    data.push(newEntry);
  }

  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}


module.exports = function (bot) {
  const usernameMap = new Map(); // @username → Telegram ID

  // 👁 Следим за всеми пользователями и запоминаем их ID
  bot.on('message', (msg) => {
    const from = msg.from;
    if (from.username) {
      usernameMap.set(`@${from.username}`, from.id);
    }

    const text = msg.text?.trim();
    const chatId = msg.chat.id;

    if (!text || !text.startsWith('+описание1')) return;

    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    console.log(lines);
    if (lines.length < 6) {
      bot.sendMessage(chatId, '❗ Формат неверный. Нужно 6 строк:\n+описание1 Имя\nНик\nPUBG ID\nВозраст\nГород',   {reply_to_message_id: msg.message_id });
      return;
    }

    const tagMatch = lines[0].match(/@(\w+)/);
    if (!tagMatch) {
      bot.sendMessage(chatId, '❗ Укажи тег: +описание1 @nickname', {reply_to_message_id: msg.message_id });
      return;
    }

    const targetUsername = '@' + tagMatch[1];
    const actor_id = usernameMap.get(targetUsername); // 🧠 пробуем получить Telegram ID

    const entry = {
      target_username: targetUsername,
      name: lines[1],
      nickname: lines[2],
      pubg_id: lines[3],
      age: lines[4],
      city: lines[5],
      clan: lines[6],
      actor_id: actor_id || null, // может быть null
      submitted_by: msg.from.username || '',
      telegram_id: msg.from.id,
      timestamp: new Date().toISOString()
    };
    saveOrUpdateDescription(entry);
    bot.sendMessage(chatId, `✅ Описание для ${targetUsername} сохранено.`, {reply_to_message_id: msg.message_id });
  });
};
