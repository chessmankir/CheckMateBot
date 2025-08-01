const SHEET_NAME = 'Clan'; // название листа в Google Sheets
const getPlayerDescription = require('./getPlayerDescription');

module.exports = function (bot, auth, SPREADSHEET_ID) {
  bot.onText(/^!описание\s+@(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const requestedUsername = `@${match[1]}`;
    try {
      const { google, displayvideo_v1beta } = require('googleapis');
      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_NAME,
      });

      const rows = res.data.values || [];
      const usernameIndex = 2;
      const playerRow = rows.find((row, index) => index > 0 && row[usernameIndex] === requestedUsername);

      if (!playerRow) {
        return bot.sendMessage(chatId, `❌ Описание для ${requestedUsername} не найдено.`, {
          reply_to_message_id: msg.message_id,
        });
      }
      console.log(playerRow);
      // Формируем ответ
      const response = `
📄 Описание игрока ${requestedUsername}:

👤 Имя: ${playerRow[0] || '—'}
🏷 Ник: ${playerRow[1] || '—'}
🎮 PUBG ID: ${playerRow[3] || '—'}
🎂 Возраст: ${playerRow[4] || '—'}
📍 Город: ${playerRow[5] || '—'}
      `.trim();

      bot.sendMessage(chatId, response, {
        reply_to_message_id: msg.message_id,
      });

    } catch (error) {
      console.error('Ошибка при получении описания:', error);
      bot.sendMessage(chatId, '❌ Произошла ошибка при получении описания.', {
        reply_to_message_id: msg.message_id,
      });
    }
  });
};
