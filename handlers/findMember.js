const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_JSON);

const SPREADSHEET_ID = '11BRhGaUWPd7dg_lPBHng0mXlpNJcPyRUkPuwSAQOx78';
const SHEET_NAME = 'Clan';

async function getSheetData() {
  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:G`,
  });

  return response.data.values || [];
}

module.exports = function (bot) {
  bot.onText(/!поиск\s+(.+)/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1].trim().toLowerCase();

    try {
      const rows = await getSheetData();

      let row = rows.find(r => (r[1] || '').toLowerCase() === query); // username
      if (!row) row = rows.find(r => (r[3] || '').toLowerCase() === query); // pubg_id
      if (!row) row = rows.find(r => (r[2] || '').toLowerCase() === query); // name

      if (!row) {
        return bot.sendMessage(chatId, `❌ Участник по запросу "${query}" не найден.`, {
          reply_to_message_id: msg.message_id
        });
      }
      
      const name = row[0] || '(нет тега)';
      const nick = row[1] || '(нет имени)';
      const tag = row[2] || ' нет тега'
      const pubgId = row[3] || '(нет PUBG ID)';
      const age = row[4] || '(возраст не указан)';
      const city = row[5] || '(город не указан)';
      const clan = row[6] || '(клан не указан)';

      const message = `📄 Найден участник: ${tag}\n\n👤 Имя: ${name}\n🧾 Ник: ${nick}\n🆔 PUBG ID: ${pubgId}\n📅 Возраст: ${age}\n📍 Город: ${city}\n🏰 Клан: ${clan}`;
      bot.sendMessage(chatId, message, {
        reply_to_message_id: msg.message_id
      });

    } catch (err) {
      console.error('Ошибка при поиске участника:', err);
      bot.sendMessage(chatId, '❌ Ошибка при поиске участника.', {
        reply_to_message_id: msg.message_id
      });
    }
  });
};
