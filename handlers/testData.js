require("dotenv").config();
const { google } = require("googleapis");

// Создание клиента Google Sheets
async function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_JSON);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

// Функция для получения данных
async function getSheetData(range = "Clan4") {
  try {
    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range,
    });
    console.log(res.data.values);
    return res.data.values || [];
  } catch (err) {
    console.error("Ошибка при получении данных:", err);
    return [];
  }
}

module.exports = getSheetData;
