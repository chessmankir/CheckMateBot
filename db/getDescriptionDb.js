// db/getDescriptionFromDb.js
const db = require('../handlers/db'); // подключение к базе

module.exports = async function getPlayerDescriptionFromDb(telegramTagOrActorId) {
  try {
    const res = await db.query(
      `SELECT * FROM clan_members 
       WHERE LOWER(telegram_tag) = LOWER($1) OR actor_id::text = $1
       LIMIT 1`,
      [telegramTagOrActorId]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      name: row.name,
      nick: row.nickname,
      pubgId: row.pubg_id,
      age: row.age,
      city: row.city
    };
  } catch (err) {
    console.error('Ошибка при запросе из базы:', err);
    return null;
  }
};
