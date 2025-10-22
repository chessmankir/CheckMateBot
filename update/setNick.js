const { Pool } = require("pg");
const isAdminChat = require('./../admin/permissionAdminChat');
const getPlayerDescription = require('./../db/getDescriptionDb');
const { google } = require("googleapis");
const getClanId = require('../clan/getClanId');

// Подключение к Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Авторизация Google Sheets
async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_JSON),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

module.exports = function (bot, auth, SPREADSHEET_ID) {
  bot.onText(/^\+ник(?:\s+@(\S+)\s+(.+)|\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const fromUser = msg.from.username ? `@${msg.from.username}` : null;

    // Определяем режим команды
    const isAdminCommand = !!match[1]; // если указан @тег
    let targetTag = match[1] ? match[1] : fromUser;
    // Привести к нижнему регистру
    targetTag = targetTag.toLowerCase();
    // Проверка, есть ли @ в начале
    if (!targetTag.startsWith('@')) {
      targetTag = '@' + targetTag;
    }
    const newNickname = match[2] || match[3];

    if (!newNickname) {
      return bot.sendMessage(chatId, "❌ Укажи ник после команды `+ник`.", { reply_to_message_id: msg.message_id });
    }

    // Проверка: если команда с тегом, но не в админском чате
    if (isAdminCommand && !isAdminChat(chatId)) {
      console.log( 'Admin');
      return ;
    }

    if (!targetTag) {
      return bot.sendMessage(chatId, "❌ У тебя нет @тега в Telegram. Добавь его в настройках.", { reply_to_message_id: msg.message_id });
    }

    const player  = await getPlayerDescription(targetTag);
    try { 
      // --- Обновляем в PostgreSQL ---
      await pool.query(
       `UPDATE clan_members SET nickname = $1 WHERE lower(telegram_tag) = lower($2)`,
        [newNickname, targetTag]
      );

      const clanId = await getClanId(chatId);
      if(clanId){

      const sheets = await getSheets();
      const range = "Clan" + player.clan;
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
      const rows = res.data.values || [];
      let updated = false;
      const targetTagLower = targetTag.toLowerCase()
      for (let i = 0; i < rows.length; i++) {
          if (rows[i][2].toLowerCase() === targetTagLower) {
          rows[i][1] = newNickname; // столбец B — Ник
          updated = true;
        }
      }
      if (updated) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range,
          valueInputOption: "RAW",
          resource: { values: rows }
        });
      }
      }
      bot.sendMessage(
        chatId,
        `✅ Ник для ${targetTag} обновлён: ${newNickname}`,
        { reply_to_message_id: msg.message_id }
      );
    } catch (err) {
      console.error("Ошибка при обновлении ника:", err);
      bot.sendMessage(chatId, "❌ Ошибка при сохранении ника.", { reply_to_message_id: msg.message_id });
    }
  });
};
