// modules/registerClanWizard.js
const db = require('../handlers/db');

// 🔧 ОБЯЗАТЕЛЬНО: объявляем код и состояние мастера
const FALLBACK_CODE = process.env.CLAN_VERIFY_CODE || '417';
const wizardState = new Map();

module.exports = function registerClanWizard(bot) {
  // ===== 1) Кнопка "Зарегистрировать клан" =====
  bot.on('callback_query', async (q) => {
    if (!q?.data || q.data !== 'register_clan') return;
    if (q.message.chat.type !== 'private') {
      return bot.answerCallbackQuery(q.id, { text: 'Регистрировать клан можно только в личке бота.' });
    }

    const chatId = q.message.chat.id;
    const userId = q.from.id;

    wizardState.set(userId, { step: 'ask_name', payload: {} });
    await bot.answerCallbackQuery(q.id);
    await bot.sendMessage(chatId, '✍️ Введите название вашего клана (например, "Black Knights").');
  });

  // ===== 2) Шаги мастера регистрации (только ЛС) =====
  bot.on('message', async (msg) => {
    if (msg.chat.type !== 'private') return;
    const userId = msg.from.id;
    const s = wizardState.get(userId);
    if (!s) return;

    // 2.1 Название клана
    if (s.step === 'ask_name') {
      const name = (msg.text || '').trim();
      if (!name) {
        return bot.sendMessage(msg.chat.id, 'Введите корректное название.');
      }
      s.payload.name = name;
      s.step = 'ask_code';
      return bot.sendMessage(msg.chat.id, '✅ Введите проверочный код.');
    }

    // 2.2 Проверочный код
    if (s.step === 'ask_code') {
      const code = (msg.text || '').trim();
      if (!code || code !== 417) {
        return bot.sendMessage(msg.chat.id, 'Код неверный. Проверьте и попробуйте ещё раз.');
      }

      const { name } = s.payload;

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
          return bot.sendMessage(
            msg.chat.id,
            `⚠️ У вас уже зарегистрирован активный клан «${check.rows[0].name}» (ID: ${check.rows[0].id}). ` +
            `Сначала деактивируйте его, чтобы создать новый.`
          );
        }

        // (B) создаём клан (без verify_code_hash и без chat_link)
        const ins = await db.query(
          `INSERT INTO clans (name, owner_actor_id, is_active)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (name) DO NOTHING
           RETURNING id`,
          [name, userId]
        );

        if (ins.rowCount === 0) {
          return bot.sendMessage(msg.chat.id, '⚠️ Клан с таким названием уже зарегистрирован.');
        }

        const clanId = ins.rows[0].id;

        await bot.sendMessage(
          msg.chat.id,
          [
            `🎉 Клан «${name}» зарегистрирован!`,
            '',
            'Дальше:',
            '1) Добавьте бота в **админ-чат**, выдайте админские права и напишите там: `!привязать админку`.',
            '2) Добавьте бота в **обычные** чаты клана, выдайте админские права и в каждом напишите: `!привызать чат`.'
          ].join('\n'),
          { parse_mode: 'Markdown' }
        );

        wizardState.delete(userId);
      } catch (err) {
        if (err && err.code === '23505') {
          // защита от гонки по уникальному индексу на owner_actor_id (is_active=TRUE)
          return bot.sendMessage(
            msg.chat.id,
            '⚠️ У вас уже есть активный клан. Сначала деактивируйте его, чтобы создать новый.'
          );
        }
        console.error('register clan error', err);
        bot.sendMessage(msg.chat.id, '❌ Ошибка при регистрации. Попробуйте позже.');
      }
    }
  });

  // ===== 3) Привязка АДМИН-ЧАТА (одного) =====
  bot.onText(/^\/bind_admin$/i, async (msg) => {
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
  bot.onText(/^\/bind_member$/i, async (msg) => {
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

      await bot.sendMessage(chatId, `✅ Чат привязан к чату.`, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('bind_member error', e);
      bot.sendMessage(chatId, '❌ Не удалось привязать чат.');
    }
  });
};
