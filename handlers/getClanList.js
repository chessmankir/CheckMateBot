const fs = require('fs');
const path = './data/clan_members.json';

function loadDescriptions() {
  if (fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path));
  }
  return [];
}

const clanLimits = {
  1: 50,
  2: 55,
  3: 60,
};

module.exports = function (bot) {
  // Команда: !список{номер}
  bot.onText(/!список(\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const clanNumber = parseInt(match[1]);

    if (!clanNumber || isNaN(clanNumber)) {
      bot.sendMessage(chatId, '❌ Неверный номер клана.', { reply_to_message_id: msg.message_id });
      return;
    }

    const data = loadDescriptions();
    const members = data.filter(entry => entry.clan?.toString() === clanNumber.toString());

    if (members.length === 0) {
      bot.sendMessage(chatId, `❗️В клане ${clanNumber} пока нет участников.`, { reply_to_message_id: msg.message_id });
      return;
    }

    const lines = members.map((m, i) => `${i + 1}. ${m.target_username || '(без тега)'}`);
    const clanLimit = clanLimits[clanNumber];
    const message = `Список участников клана Checkmate ${clanNumber} — ${members.length}/${clanLimit}:\n\n` + lines.join('\n');

    bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });
  });

  // Команда: !полный список
  bot.onText(/!полный список/i, (msg) => {
    const chatId = msg.chat.id;
    const data = loadDescriptions();

    if (data.length === 0) {
      bot.sendMessage(chatId, '❗️Список всех участников пуст.', { reply_to_message_id: msg.message_id });
      return;
    }

    const lines = data.map((m, i) => {
      const name = m.target_username || '(без тега)';
      const clan = m.clan || '?';
      return `${i + 1}. ${name} (клан ${clan})`;
    });

    const message = `📋 Полный список участников всех кланов (${data.length}):\n\n` + lines.join('\n');

    bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });
  });
};
