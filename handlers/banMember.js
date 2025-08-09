const { google } = require('googleapis');
const db = require('./db');
const isAdminChat = require('../admin/permissionAdminChat');

const SHEET_PREFIX = 'Clan';
const ALLOWED_CHAT_IDS = [
  -1002549710535, // чат кланов 1/2
  -1002833167359  // чат клана 3
];

async function getSheetIdByTitle(sheets, spreadsheetId, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets.find(s => s.properties.title === title);
  return sheet ? sheet.properties.sheetId : null;
}

module.exports = function (bot, auth, SPREADSHEET_ID) {
  bot.onText(/^!бан1\s+@(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdminChat(chatId)) return;

    const username = `@${match[1]}`; // тег вида @user

    try {
      // 1) находим запись в БД
      const res = await db.query(
        `SELECT actor_id, clan FROM clan_members WHERE LOWER(telegram_tag) = LOWER($1) LIMIT 1`,
        [username]
      );

      if (res.rowCount === 0) {
        return bot.sendMessage(chatId, `❌ Участник ${username} не найден в базе.`, {
          reply_to_message_id: msg.message_id,
        });
      }

      const { actor_id: actorId, clan } = res.rows[0];

      // 2) помечаем неактивным в БД
      await db.query(
        `UPDATE clan_members SET active = FALSE WHERE LOWER(telegram_tag) = LOWER($1)`,
        [username]
      );

      // 3) если есть actorId — баним в чате
      if (actorId) {
        const targetChatId = (clan === 3) ? ALLOWED_CHAT_IDS[1] : ALLOWED_CHAT_IDS[0];
        try {
          await bot.banChatMember(targetChatId, actorId);
        } catch (e) {
          console.warn(`Не удалось забанить ${username} в чате ${targetChatId}:`, e.message);
        }
      }

      // 4) удаляем строку из соответствующего листа Google Sheets (Clan{clan}) по тегу
      const client = await auth.getClient();
      const sheets = google.sheets({ version: 'v4', auth: client });
      const sheetTitle = `${SHEET_PREFIX}${clan}`;
      const sheetId = await getSheetIdByTitle(sheets, SPREADSHEET_ID, sheetTitle);

      if (sheetId !== null) {
        const sheetRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetTitle}!A2:I`, // A..I: name,nickname,telegram_tag,pubg_id,age,city,clan,actor_id,created_at
        });

        const rows = sheetRes.data.values || [];
        const usernameIndex = 2; // C = telegram_tag
        const rowIndex = rows.findIndex(
          r => (r[usernameIndex] || '').toLowerCase() === username.toLowerCase()
        );

        if (rowIndex !== -1) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
              requests: [{
                deleteDimension: {
                  range: {
                    sheetId,
                    dimension: 'ROWS',
                    startIndex: rowIndex + 1, // +1 из-за заголовков
                    endIndex: rowIndex + 2,
                  }
                }
              }]
            }
          });
        }
      }

      await bot.sendMessage(
        chatId,
        actorId
          ? `🚫 ${username} забанен: в БД помечен неактивным, из таблицы удалён, в чате заблокирован.`
          : `🚫 ${username} помечен неактивным и удалён из таблицы. В чате не забанен (нет actor_id).`,
        { reply_to_message_id: msg.message_id }
      );

    } catch (err) {
      console.error('Ошибка при бане:', err);
      await bot.sendMessage(chatId, `❌ Ошибка при бане ${username}.`, {
        reply_to_message_id: msg.message_id,
      });
    }
  });
};
