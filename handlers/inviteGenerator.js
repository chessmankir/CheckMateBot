const fs = require('fs');
const path = './data/invite_codes.json';

function generateCode(clanNumber) {
  const code = `clan-${Math.floor(100000 + Math.random() * 900000)}`;
  const newCode = { code, clan: clanNumber, used: false };
console.log(code);
  let codes = [];
  if (fs.existsSync(path)) {
    try {
      const fileContent = fs.readFileSync(path, 'utf8');
      if (fileContent.trim()) {
        codes = JSON.parse(fileContent);
      }
    } catch (error) {
      console.log('Ошибка чтения файла invite_codes.json:', error.message);
      codes = [];
    }
  }

  codes.push(newCode);
  fs.writeFileSync(path, JSON.stringify(codes, null, 2));

  return newCode;
}

module.exports = function(bot) {
  bot.onText(/!инвайт(\d+)/, (msg, match) => {
    const clanNumber = parseInt(match[1]);
    console.log(clanNumber);
    if (isNaN(clanNumber)) {
      return bot.sendMessage(msg.chat.id, '❗ Укажи номер клана: !инвайт 1');
    }

    const code = generateCode(clanNumber);
    console.log(code);
    bot.sendMessage(msg.chat.id, `🎟️ Инвайт-код:`, {
      parse_mode: 'HTML'
    });
    
    bot.sendMessage(msg.chat.id, `${code.code}`, {
      parse_mode: 'HTML'
    });
  });
};
