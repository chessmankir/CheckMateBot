const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function saveMemberDb(data) {
  const {
    name,
    nick,
    target_username,
    age,
    pubg_id,
    city,
    clan,
    actor_id
  } = data;

  const client = await pool.connect();
  try {
    const now = new Date();

    // 1. Ищем по actor_id
    const checkByActorId = await client.query(
      'SELECT id FROM clan_members WHERE actor_id = $1',
      [actor_id]
    );

    if (checkByActorId.rows.length > 0) {
      // 🔁 Обновляем по actor_id
      await client.query(
        `UPDATE clan_members
         SET name = $1, nickname = $2, telegram_tag = $3, age = $4,
             pubg_id = $5, city = $6, clan = $7, created_at = $8
         WHERE actor_id = $9`,
        [name, nick, target_username, age, pubg_id, city, clan, now, actor_id]
      );
      return { status: 'updated_by_actor_id' };
    }

    // 2. Ищем по тегу, если actor_id нет
    const checkByTag = await client.query(
      'SELECT id FROM clan_members WHERE telegram_tag = $1',
      [target_username]
    );

    if (checkByTag.rows.length > 0) {
      // 🔁 Обновляем по тегу
      await client.query(
        `UPDATE clan_members
         SET name = $1, nickname = $2, age = $3, pubg_id = $4, city = $5, clan = $6, created_at = $7, actor_id = $8
         WHERE telegram_tag = $9`,
        [name, nick, age, pubg_id, city, clan, now, actor_id, target_username]
      );
      return { status: 'updated_by_tag' };
    }

    // 3. Если не найдено — создаём нового
    await client.query(
      `INSERT INTO clan_members 
        (name, nickname, telegram_tag, age, pubg_id, city, clan, created_at, actor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [name, nick, target_username, age, pubg_id, city, clan, now, actor_id]
    );

    return { status: 'created' };

  } catch (error) {
    console.error('❌ Ошибка сохранения в БД:', error);
    return { status: 'error', error };
  } finally {
    client.release();
  }
}

module.exports = saveMemberDb;
