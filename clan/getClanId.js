// modules/cmd.places.js
const db = require('../handlers/db');

// Текущие лимиты кланов
module.exports = async function (chatId) {
    try {
      // Считаем активных по каждому клан
      const clanIdRes = await db.query(
        `SELECT id AS clan_id
           FROM public.clans
          WHERE admin_chat_id = $1
          LIMIT 1`,
        [chatId]
      );
    //  console.log(clanIdRes);
      if (clanIdRes.rowCount === 0) {
        return 0
      }

      const clanId = clanIdRes.rows[0].clan_id;
      return clanId;
    }
    catch (e){
      console.log('catch');
      console.error('❌ Ошибка при получении id клана:', err);
      return 0;
    }
};
