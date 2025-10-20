// modules/registerClanWizard.js
const db = require('../handlers/db');

const FALLBACK_CODE = process.env.CLAN_VERIFY_CODE || '417';
const wizardState = new Map();

// простые валидаторы/нормализаторы
function normText(s) { return (s || '').toString().trim(); }
function normDigits(s) { return (s || '').toString().replace(/\D+/g, ''); }
function toIntOrNull(s) {
  const n = parseInt((s || '').toString().trim(), 10);
  return Number.isFinite(n) ? n : null;
}

module.exports = function registerClanWizard(bot) {
  // ===== 1) Кнопка "Зарегистрировать клан" =====
  bot.on('callback_query', async (q) => {
    if (!q?.data || q.data !== 'register_clan') return;
    if (q.message.chat.type !== 'private') {
      return bot.answerCallbackQuery(q.id, { text: 'Регистрировать клан можно только в личке бота.' });
    }

    const chatId = q.message.chat.id;
    const userId = q.from.id;

    wizardState.set(userId, { step: 'ask_clan_name', payload: {} });
    await bot.answerCallbackQuery(q.id);
    await bot.sendMessage(chatId, '✍️ Введите название вашего клана (например, "Black Knights").');
  });

  // ===== 2) Шаги мастера регистрации (только ЛС) =====
  bot.on('message', async (msg) => {
    if (msg.chat.type !== 'private') return;
    const userId = msg.from.id;
    const s = wizardState.get(userId);
    if (!s) return;

    const p = s.payload;

    // 2.1 Название клана
    if (s.step === 'ask_clan_name') {
      const name = normText(msg.text);
      if (!name) return bot.sendMessage(msg.chat.id, 'Введите название.');
      p.clan_name = name;
      s.step = 'ask_code';
      return bot.sendMessage(msg.chat.id, '✅ Введите проверочный код.');
    }

    // 2.2 Проверочный код
    if (s.step === 'ask_code') {
      const code = normText(msg.text);
      if (!code || code !== FALLBACK_CODE) {
        return bot.sendMessage(msg.chat.id, 'Код неверный. Проверьте и попробуйте ещё раз.');
      }
      s.step = 'ask_leader_name';
      return bot.sendMessage(msg.chat.id, '👤 Введите имя (как зовут).');
    }

    // 2.3 Имя лидера
    if (s.step === 'ask_leader_name') {
      const leaderName = normText(msg.text);
      if (!leaderName) return bot.sendMessage(msg.chat.id, 'Введите имя.');
      p.leader_name = leaderName;
      s.step = 'ask_leader_nick';
      return bot.sendMessage(msg.chat.id, '🏷 Введите ник (в игре).');
    }

    // 2.4 Ник лидера
    if (s.step === 'ask_leader_nick') {
      const leaderNick = normText(msg.text);
      if (!leaderNick) return bot.sendMessage(msg.chat.id, 'Введите ник.');
      p.leader_nick = leaderNick;
      s.step = 'ask_leader_pubg_id';
      return bot.sendMessage(msg.chat.id, '🎮 Введите PUBG ID (только цифры).');
    }

    // 2.5 PUBG ID лидера
    if (s.step === 'ask_leader_pubg_id') {
      const pubgId = normDigits(msg.text);
      if (!pubgId) return bot.sendMessage(msg.chat.id, 'Введите PUBG ID (только цифры).');
      p.leader_pubg_id = pubgId;
      s.step = 'ask_leader_age';
      return bot.sendMessage(msg.chat.id, '🎂 Введите ваш возраст (число).');
    }

    // 2.6 Возраст лидера
    if (s.step === 'ask_leader_age') {
      const age = toIntOrNull(msg.text);
      if (!age || age < 10 || age > 99) {
        return bot.sendMessage(msg.chat.id, 'Введите корректный возраст (10–99).');
      }
      p.leader_age = age;
      s.step = 'ask_leader_city';
      return bot.sendMessage(msg.chat.id, '📍 Введите город.');
    }

    // 2.7 Город лидера → финал (создание клана + лидера)
    if (s.step === 'ask_leader_city') {
      const city = normText(msg.text);
      if (!city) return bot.sendMessage(msg.chat.id, 'Введите корректный город.');
      p.leader_city = city;

      const clanName = p.clan_name;
      const telegramTag = msg.from.username ? '@' + msg.from.username : null;

      try {
        // (A) уже есть активный клан у этого владельца?
        const check = await db.query(
          `SELECT id, name
             FROM clans
            WHERE owner_actor_id = $1 AND is_active = TRUE
            LIMIT 1`,
          [userId]
        );
        if (check.rowCount > 0) {
          wizardState.delete(userId);
          return bot.sendMessage(
            msg.chat.id,
            `⚠️ У вас уже зарегистрирован активный клан «${check.rows[0].name}» (ID: ${check.rows[0].id}). ` +
            `Сначала деактивируйте его, чтобы создать новый.`
          );
        }

        await db.query('BEGIN');

        // (B) создаём клан
        const insClan = await db.query(
          `INSERT INTO clans (name, owner_actor_id, is_active)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (name) DO NOTHING
           RETURNING id`,
          [clanName, userId]
        );
        if (insClan.rowCount === 0) {
          await db.query('ROLLBACK');
          wizardState.delete(userId);
          return bot.sendMessage(msg.chat.id, '⚠️ Клан с таким названием уже зарегистрирован.');
        }
        const clanId = insClan.rows[0].id;

        // (C) сохраняем лидера в clan_members
        // Требуется уникальный ключ на (clan, actor_id) — чтобы апдейтить без дублей
        await db.query(
          `INSERT INTO clan_members
             (clan_id, actor_id, telegram_tag, name, nickname, pubg_id, age, city, active, created_at, clan)
           VALUES
             ($1,   $2,       $3,           $4,   $5,   $6,      $7,  $8, TRUE, NOW(), 1)
           ON CONFLICT (clan, actor_id) DO UPDATE
             SET telegram_tag = EXCLUDED.telegram_tag,
                 name         = EXCLUDED.name,
                 nickname     = EXCLUDED.nickname,
                 pubg_id      = EXCLUDED.pubg_id,
                 age          = EXCLUDED.age,
                 city         = EXCLUDED.city,
                 active       = TRUE`,
          [
            clanId,
            userId,
            telegramTag,
            p.leader_name,
            p.leader_nick,
            p.leader_pubg_id,
            p.leader_age,
            p.leader_city
          ]
        );

        await db.query('COMMIT');

        await bot.sendMessage(
          msg.chat.id,
          [
            `🎉 Клан «${clanName}» зарегистрирован!`,
            `👑 Лидер: ${p.leader_name} (${p.leader_nick}), PUBG ID: ${p.leader_pubg_id}, ${p.leader_age} лет, ${p.leader_city}.`,
            '',
            'Дальше:',
            '1) Добавьте бота в **админ-чат**, выдайте админские права и напишите там: `!привязать админку`.',
            '2) Добавьте бота в **обычные** чаты клана и в каждом напишите: `!привязать чат`.'
          ].join('\n'),
          { parse_mode: 'Markdown' }
        );

        wizardState.delete(userId);
      } catch (err) {
        try { await db.query('ROLLBACK'); } catch (_) {}
        if (err && err.code === '23505') {
          return bot.sendMessage(
            msg.chat.id,
            '⚠️ У вас уже есть активный клан. Сначала деактивируйте его, чтобы создать новый.'
          );
        }
        console.error('register clan FINAL error', err);
        bot.sendMessage(msg.chat.id, '❌ Ошибка при регистрации. Попробуйте позже.');
        wizardState.delete(userId);
      }
    }
  });

  // ===== 3) Привязка АДМИН-ЧАТА (одного) =====
  // команда: !привязать админку
  bot.onText(/^!привязать\s+админку$/iu, async (msg) => {
    if (msg.chat.type === 'private') {
      return bot.sendMessage(msg.chat.id, 'Команду нужно писать в админ-чате клана.');
    }

    const adminChatId = msg.chat.id;
    const ownerId = msg.from.id;

    try {
      const { rows } = await db.query(
        `SELECT id FROM clans WHERE owner_actor_id = $1 AND is_active = TRUE LIMIT 1`,
        [ownerId]
      );
      if (!rows.length) {
        return bot.sendMessage(adminChatId, 'Сначала зарегистрируйте клан в личке бота.');
      }

      const clanId = rows[0].id;

      await db.query(
        `UPDATE clans
            SET admin_chat_id = $1
          WHERE id = $2`,
        [adminChatId, clanId]
      );

      await bot.sendMessage(
        adminChatId,
        `✅ Этот чат закреплён как *админ-чат* клана #${clanId}.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('bind_admin error', e);
      bot.sendMessage(adminChatId, '❌ Не удалось привязать админ-чат.');
    }
  });

  // ===== 4) Привязка ОБЫЧНОГО чата (много на клан) =====
  // команда: !привязать чат
  bot.onText(/^!привязать\s+чат$/iu, async (msg) => {
    if (msg.chat.type === 'private') {
      return bot.sendMessage(msg.chat.id, 'Команду нужно писать в групповом чате клана.');
    }

    const chatId = msg.chat.id;
    const ownerId = msg.from.id;

    try {
      const { rows } = await db.query(
        `SELECT id FROM clans WHERE owner_actor_id = $1 AND is_active = TRUE LIMIT 1`,
        [ownerId]
      );
      if (!rows.length) {
        return bot.sendMessage(chatId, 'Сначала зарегистрируйте клан в личке бота.');
      }

      const clanId = rows[0].id;

      await db.query(
        `INSERT INTO clan_member_chats (clan_id, chat_id, active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (chat_id) DO UPDATE
           SET clan_id = EXCLUDED.clan_id,
               active = TRUE`,
        [clanId, chatId]
      );

      await bot.sendMessage(chatId, `✅ Чат привязан к клану.`, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('bind_member error', e);
      bot.sendMessage(chatId, '❌ Не удалось привязать чат.');
    }
  });
};
