// db/getDescriptionFromDb.js
const db = require('../handlers/db'); // подключение к базе

module.exports = async function getPlayerDescriptionFromDb(telegramTagOrActorId) {
  try {
    const rawKey = String(telegramTagOrActorId || '').trim();
    const isTag = rawKey.startsWith('@');
    const isNumericId = /^\d+$/.test(rawKey);

    let res;

    if (isTag) {
      // Поиск строго по тегу
      res = await db.query(
        `SELECT *
         FROM clan_members
         WHERE active = TRUE AND LOWER(telegram_tag) = LOWER($1)
         LIMIT 1`,
        [rawKey]
      );
    } else if (isNumericId) {
      // Поиск строго по actor_id
      res = await db.query(
        `SELECT *
         FROM clan_members
         WHERE active = TRUE AND actor_id = $1::bigint
         LIMIT 1`,
        [rawKey]
      );
    } else {
      // Фолбэк: трактуем как тег (без @ могли передать)
      const normalizedTag = rawKey.startsWith('@') ? rawKey : `@${rawKey}`;
      res = await db.query(
        `SELECT *
         FROM clan_members
         WHERE active = TRUE AND LOWER(telegram_tag) = LOWER($1)
         LIMIT 1`,
        [normalizedTag]
      );
    }

    if (!res || res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      name: row.name,
      nick: row.nickname,
      pubgId: row.pubg_id,
      age: row.age,
      city: row.city,
      clan: row.clan
    };
  } catch (err) {
    console.error('Ошибка при запросе из базы:', err);
    return null;
  }
};
