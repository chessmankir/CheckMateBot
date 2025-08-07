const { google } = require('googleapis');
const db = require('./db');
const isAdminChat = require('../admin/permissionAdminChat');

const SHEET_NAME = 'Clan';

const ALLOWED_CHAT_IDS = [
  -1002549710535, // ID превого чата
  -1002833167359  // ID второго чата
];

module.exports = function (bot, auth, SPREADSHEET_ID) {
  bot.onText(/^!бан1\s+@(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = `@${match[1]}`;

    if (!isAdminChat(chatId)) return;

    try {
      // Получаем пользователя из базы по username
      const res = await db.query(
        `SELECT actor_id, clan FROM clan_members WHERE telegram_tag = $1 LIMIT 1`,
        [username]
      );

      if (res.rowCount === 0) {
        return bot.sendMessage(chatId, `❌ Участник ${username} не найден в базе.`, {
          reply_to_message_id: msg.message_id,
        });
      }

      const actorId = res.rows[0].actor_id;
      const targetChatId = res.rows[0].clan === 3 ? ALLOWED_CHAT_IDS[1] : ALLOWED_CHAT_IDS[0];

      await bot.banChatMember(targetChatId, actorId); // банит

      // 1. Обновляем статус в базе
      await db.query(
        `UPDATE clan_members SET active = false WHERE actor_id = $1`,
        [actorId]
      );

      // 2. Удаляем из Google Sheets
      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });

      const sheetRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:G`,
      });

      const rows = sheetRes.data.values || [];
      const usernameIndex = 2; // Telegram Tag
      const rowIndex = rows.findIndex(row => (row[usernameIndex] || '').toLowerCase() === username.toLowerCase());

      if (rowIndex !== -1) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: 0,
                  dimension: 'ROWS',
                  startIndex: rowIndex + 1, // +1 из-за заголовка
                  endIndex: rowIndex + 2,
                }
              }
            }]
          }
        });
      }

      bot.sendMessage(chatId, `🚫 ${username} был забанен`, {
        reply_to_message_id: msg.message_id,
      });

    } catch (err) {
      console.error('Ошибка при бане:', err);
      bot.sendMessage(chatId, `❌ Произошла ошибка при бане ${username}.`, {
        reply_to_message_id: msg.message_id,
      });
    }
  });
};
