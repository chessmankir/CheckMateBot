const SHEET_NAME = 'Clan'; // проверь, как у тебя назван лист

const clanLimits = {
  1: 50,
  2: 55,
  3: 60
};

async function getSheetData(auth, SPREADSHEET_ID) {
   const { google, displayvideo_v1beta } = require('googleapis');
   const sheets = google.sheets({ version: 'v4', auth });

   const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:G`, // A — actor_id, B — username, G — clan
  });

  return response.data.values || [];
}

module.exports = function (bot, auth, SPREADSHEET_ID) {
  // !списокN
  bot.onText(/!список(\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const clanNumber = parseInt(match[1]);

    if (!clanLimits[clanNumber]) {
      return bot.sendMessage(chatId, '❌ Неверный номер клана.', {
        reply_to_message_id: msg.message_id
      });
    }

    try {
      const rows = await getSheetData(auth, SPREADSHEET_ID);
      const members = rows.filter(row => row[6]?.toString() === clanNumber.toString());

      if (members.length === 0) {
        return bot.sendMessage(chatId, `❗️В клане ${clanNumber} пока нет участников.`, {
          reply_to_message_id: msg.message_id
        });
      }
      const lines = members.map((m, i) => `${i + 1}. ${m[2] || '(без тега)'}`);
      const clanLimit = clanLimits[clanNumber];
      const message = `Список участников клана Checkmate ${clanNumber} — ${members.length}/${clanLimit}:\n\n${lines.join('\n')}`;

      bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });

    } catch (err) {
      console.error('Ошибка при получении списка:', err);
      bot.sendMessage(chatId, '❌ Ошибка при получении списка.', { reply_to_message_id: msg.message_id });
    }
  });

  // !полныйсписок
  bot.onText(/!полныйсписок/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const rows = await getSheetData();

      if (rows.length === 0) {
        return bot.sendMessage(chatId, '❗️Список участников пуст.', {
          reply_to_message_id: msg.message_id
        });
      }

      const lines = rows.map((row, index) => {
        const username = row[2] || '(без тега)';
        const clan = row[6] || '—';
        return `${index + 1}. ${username} — клан ${clan}`;
      });

      const message = `Полный список участников:\n\n${lines.join('\n')}`;
      bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });

    } catch (err) {
      console.error('Ошибка при получении полного списка:', err);
      bot.sendMessage(chatId, '❌ Ошибка при получении полного списка.', { reply_to_message_id: msg.message_id });
    }
  });
};
