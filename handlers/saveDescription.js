const { google, displayvideo_v1beta } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '11BRhGaUWPd7dg_lPBHng0mXlpNJcPyRUkPuwSAQOx78';
const SHEET_NAME = 'Clan';

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_JSON);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// 📌 Основная функция сохранения данных
async function saveDescription(data) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME,
    });

    const rows = getRes.data.values || [];
    const headers = rows[0];
  //  const actorIdIndex = headers.indexOf('actor_id');
    const tagindex = 2;
    let foundRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][tagindex] === String(data.target_username)) {
        foundRowIndex = i + 1;
        break;
      }
    }
    console.log(foundRowIndex);

    const newRow = [
      data.name || '',
      data.nick || '',
      data.target_username || '',
      data.pubg_id || '',
      data.age || '',
      data.city || '',
      data.clan || '',
      data.actor_id,
      data.date,
      ];
    console.log(newRow);
    
    if (foundRowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${foundRowIndex}:I${foundRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow],
        },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_NAME,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [newRow],
        },
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при сохранении описания:', error);
  }
}

// 📬 Обработчик команды "+описание1 @ник"
module.exports = function (bot) {
  bot.onText(/^\+описание1\s+@(\S+)\n(.+)/s, async (msg, match) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    const target_username = `@${match[1]}`;
    const lines = match[2].trim().split('\n');
    console.log('description');
    if (lines.length < 6) {
      return bot.sendMessage(chatId, '❌ Не хватает данных. Нужно 6 строк после ника.', {
        reply_to_message_id: msg.message_id,
      });
    }
    
    const data = {
      name: lines[0],  
      nick: lines[1],
      pubg_id: lines[2],
      target_username,  
      age: lines[3],
      city: lines[4],
      clan: lines[5],
      actor_id: '',
      date: Date.now()
    };
    await saveDescription(data);

    bot.sendMessage(chatId, `✅ Описание для ${target_username} сохранено.`, {
      reply_to_message_id: msg.message_id,
    });
  });
};
