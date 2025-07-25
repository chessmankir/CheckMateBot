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
  3: 60
};

module.exports = function (bot) {
  bot.onText(/!список(\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const clanNumber = parseInt(match[1]);

    if (!clanNumber || isNaN(clanNumber)) {
      bot.sendMessage(chatId, '❌ Неверный номер клана.');
      return;
    }

    const data = loadDescriptions();
    const members = data.filter(
      entry => entry.clan?.toString() === clanNumber.toString()
    );

    if (members.length === 0) {
      bot.sendMessage(chatId, `❗ В клане ${clanNumber} пока нет участников.`);
      return;
    }

    const lines = members.map((m, i) => `${i + 1}. ${m.target_username || '(без тега)'}`);
    const clanLimit = clanLimits[clanNumber];
    const message = `Список участников клана Checkmate ${clanNumber} — ${members.length}/${clanLimit}\n\n${lines.join('\n')}`;

    bot.sendMessage(chatId, message);
  });
};
