const db = require('./db');
const fs = require('fs');
const saveDescription = require('./saveDescriptionFunc');
const isAllowedChat = require('../admin/permissionChats'); // пока не используется
const saveMemberDb = require('./saveMemberDb');

const usersInProcess = new Map();

module.exports = function (bot, notifyChatId, inviteLink1, inviteLink2) {
  // /start — только в личке
  bot.onText(/^\/start$/, (msg) => {
    if (msg.chat.type !== 'private') return; // игнор в группах

    const chatId = msg.chat.id;
    const welcomeText = 'Добро пожаловать в комьюнити Checkmate! ♟️';

    bot.sendPhoto(chatId, fs.readFileSync('./Images/IMG_3371.png'), {
      caption: welcomeText,
      filename: 'welcome_image.png',
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Тгк ChessmanKir 🧩', url: 'https://t.me/chessmankirLive' },
            { text: 'Новости Pubg 🤝', url: 'https://t.me/winepubgm' }
          ],
          [
            { text: 'Хочешь вступить в клан?', callback_data: 'join_clan' }
          ]
        ]
      }
    });
  });

  // Кнопки
  bot.on('callback_query', async (query) => {
    const chat = query.message?.chat;
    const chatId = chat?.id;
    const userId = query.from.id;

    // Запрет запуска из групп/каналов
    if (chat?.type !== 'private') {
      await bot.answerCallbackQuery(query.id);
      return bot.sendMessage(
        chatId,
        'Чтобы продолжить, напиши мне в личные сообщения и нажми /start.'
      );
    }

    if (query.data === 'join_clan') {
      return bot.sendMessage(chatId, 'Ты хочешь вступить в клан?', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Да ✅', callback_data: 'join_yes' },
              { text: 'Нет ❌', callback_data: 'join_no' }
            ]
          ]
        }
      });
    }

    if (query.data === 'join_no') {
      await bot.answerCallbackQuery(query.id);
      return bot.sendMessage(chatId, 'Хорошо, может в следующий раз 😊', {
        reply_to_message_id: query.message.message_id
      });
    }

    if (query.data === 'join_yes') {
      await bot.answerCallbackQuery(query.id);
      // сохраняем, в каком чате идёт анкета (личка)
      usersInProcess.set(userId, { step: 'invite', expectedChatId: chatId, data: {} });
      return bot.sendMessage(chatId, 'Введи свой инвайт-код:', {
        reply_to_message_id: query.message.message_id
      });
    }
  });

  // Пошаговая анкета — только личка и только тот же чат
  bot.on('message', async (msg) => {
    if (msg.chat.type !== 'private') return; // полностью игнорим группы/каналы

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text?.trim();

    if (!text || text.startsWith('/')) return;
    if (!usersInProcess.has(userId)) return;

    const user = usersInProcess.get(userId);
    if (user.expectedChatId && user.expectedChatId !== chatId) return; // сообщение не из того чата

    // Шаг 1 — проверка инвайта
    if (user.step === 'invite') {
      const code = text;
      const res = await db.query(
        'SELECT * FROM invites WHERE invite_code = $1 AND is_active = true',
        [code]
      );
      if (res.rowCount === 0) {
        return bot.sendMessage(
          chatId,
          '❌ Код недействителен или уже использован. Введи снова:'
        );
      }

      user.data.inviteCode = code;
      user.data.clan = res.rows[0].clan_name;
      user.step = 'pubg_id';
      return bot.sendMessage(chatId, '✅ Код принят. Введи свой PUBG ID:');
    }

    // Шаг 2 — PUBG ID
    if (user.step === 'pubg_id') {
      user.data.pubg_id = text;
      user.step = 'name';
      return bot.sendMessage(chatId, 'Введи своё имя:');
    }

    // Шаг 3 — имя
    if (user.step === 'name') {
      user.data.name = text;
      user.step = 'nick';
      return bot.sendMessage(chatId, 'Введи свой игровой ник:');
    }

    // Шаг 3.1 — ник
    if (user.step === 'nick') {
      user.data.nick = text;
      user.step = 'age';
      return bot.sendMessage(chatId, 'Сколько тебе лет?');
    }

    // Шаг 4 — возраст
    if (user.step === 'age') {
      user.data.age = text;
      user.step = 'city';
      return bot.sendMessage(chatId, 'Из какого ты города?');
    }

    // Шаг 5 — город → сохраняем
    if (user.step === 'city') {
      user.data.city = text;

      const target_username = msg.from.username ? `@${msg.from.username}` : '';

      const dataToSave = {
        name: user.data.name,
        nick: user.data.nick || '',
        target_username, // корректно
        pubg_id: user.data.pubg_id,
        age: user.data.age,
        city: user.data.city,
        clan: user.data.clan,
        actor_id: userId,
        date: 0
      };

      try {
        await saveDescription(dataToSave);
        await db.query('UPDATE invites SET is_active = false WHERE invite_code = $1', [
          user.data.inviteCode
        ]);
        await saveMemberDb(dataToSave);

        await bot.sendMessage(
          chatId,
          '🎉 Ты принят в клан! Добро пожаловать в клан CheckMate♟️'
        );

        if (Number(dataToSave.clan) === 1 || Number(dataToSave.clan) === 2) {
          await bot.sendMessage(chatId, inviteLink1);
        } else {
          await bot.sendMessage(chatId, inviteLink2);
        }
      } catch (err) {
        console.error('❌ Ошибка при приёме в клан:', err);
        await bot.sendMessage(
          chatId,
          'Произошла ошибка при сохранении данных. Попробуй позже.'
        );
      } finally {
        usersInProcess.delete(userId);
      }
    }
  });
};
