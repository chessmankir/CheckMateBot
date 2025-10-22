// db/createSubclan.js
/**
 * Создать подклан в рамках клана.
 *
 * @param {object} params
 * @param {number} params.clanId          - ID основного клана (public.clans.id)
 * @param {number} params.leaderActorId   - actor_id лидера подклана
 * @param {number} [params.memberLimit]   - лимит участников подклана (1..1000)
 * @param {string} [params.inviteLink]    - (необязательная) ссылка-приглашение; если не задана, берём из public.clans.invite_link
 * @returns {Promise<object>}             - созданная строка subclans
 */
const db = require('../handlers/db');

module.exports = async function createSubclan({
  clanId,
  leaderActorId,
  memberLimit,
  inviteLink
}) {
  console.log('db');
  console.log(clanId);
  // --- базовая валидация входа ---
  /*if (!Number.isInteger(clanId) || clanId <= 0) {
    throw new Error('Некорректный clanId');
  }
  if (!Number.isInteger(leaderActorId) || leaderActorId <= 0) {
    throw new Error('Некорректный leaderActorId');
  }
  
  if (!Number.isInteger(limit) || limit <= 0 || limit > 1000) {
    throw new Error('Некорректный memberLimit (допустимо 1..1000)');
  }*/
  const limit = Number(memberLimit);
  // --- тянем клан + его дефолтную ссылку ---

  // --- проверка, что лидер активен в ЭТОМ клане ---
  const leaderRes = await db.query(
    `SELECT 1
       FROM public.clan_members
      WHERE actor_id = $1
        AND clan_id = $2
        AND active = TRUE
      LIMIT 1`,
    [leaderActorId, clanId]
  );
  if (leaderRes.rowCount === 0) {
    throw new Error('Лидер не найден среди активных участников этого клана');
  }

  // --- создать подклан ---
  try {
    const insertRes = await db.query(
      `INSERT INTO public.subclans (clan_id, leader_actor_id, invite_link, member_limit)
       VALUES ($1, $2, $3, $4)
       RETURNING id, clan_id, leader_actor_id, invite_link, member_limit, active, created_at, updated_at`,
      [clanId, leaderActorId, inviteLink, limit]
    );
    return insertRes.rows[0];
  } catch (err) {
    // единственное "жёсткое" правило — один лидер не ведёт два активных подклана в одном клане
    if (err?.message?.includes('subclans_leader_active_uidx')) {
      throw new Error('Этот лидер уже возглавляет активный подклан в этом клане');
    }
    throw err;
  }
};
