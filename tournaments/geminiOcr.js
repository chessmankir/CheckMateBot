const fetch = require('node-fetch');
const isAdminChat = require('../admin/permissionAdminChat');
const extractTeamsFromImageUrl = require('./geminiExtractTeams'); // новый модуль

// максимум 5 картинок из альбома
const MAX_IMAGES = 5;

// для хранения media_group
const mediaGroups = new Map();

/* ===================== ПОДСЧЁТ ОЧКОВ ===================== */

function getPlacementPts(place) {
  switch (place) {
    case 1:
      return 10;
    case 2:
      return 6;
    case 3:
      return 5;
    case 4:
      return 4;
    case 5:
      return 3;
    case 6:
      return 2;
    case 7:
      return 1;
    default:
      return 0;
  }
}

/**
 * На вход: массив команд со всех страниц:
 * [
 *   { place: 1, players: [...], totalKills: 10 },
 *   { place: 2, players: [...], totalKills: 6 },
 *   ...
 * ]
 * На выход: отсортированный массив с добавленными полями:
 * killsPts, placementPts, totalPts
 */
function calcAndSortTeams(allTeams) {
  const withPts = allTeams.map((t) => {
    const killsPts = t.totalKills || 0;
    const placementPts = t.place != null ? getPlacementPts(t.place) : 0;
    const totalPts = killsPts + placementPts;

    return {
      place: t.place,
      players: t.players,
      totalKills: t.totalKills,
      killsPts,
      placementPts,
      totalPts,
    };
  });

  // Сортировка по ПТС (desc), потом по киллам (desc), потом по месту (asc)
  withPts.sort((a, b) => {
    if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts;
    if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;

    // место меньше — лучше
    const aPlace = a.place == null ? Infinity : a.place;
    const bPlace = b.place == null ? Infinity : b.place;
    return aPlace - bPlace;
  });

  return withPts;
}

/* ===================== ОСНОВНОЙ ХЕНДЛЕР ===================== */

module.exports = function registerOcrResultsHandler(bot) {
  bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = await isAdminChat(chatId);
    if (!isAdmin) return;

    const groupId = msg.media_group_id;
    const caption = (msg.caption || '').trim();

    // Триггерим ЛЮБОЙ кейс только если есть команда !результа3
    const isTrigger = /^!результаты3/i.test(caption);

    /* ---------- Одиночное фото ---------- */
    if (!groupId) {
      if (!isTrigger) return;

      const fileId = msg.photo[msg.photo.length - 1].file_id;
      return processImagesArray(
        bot,
        chatId,
        [{ fileId, messageId: msg.message_id }],
        msg.message_id
      );
    }

    /* ---------- Media Group (альбом) ---------- */
    let group = mediaGroups.get(groupId);
    if (!group) {
      group = {
        chatId,
        photos: [],
        caption: '',
        firstMessageId: msg.message_id,
        timeout: null,
      };
      mediaGroups.set(groupId, group);
    }

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    group.photos.push({ fileId, messageId: msg.message_id });

    if (caption) {
      group.caption = caption;
      group.firstMessageId = msg.message_id;
    }

    if (group.timeout) clearTimeout(group.timeout);

    group.timeout = setTimeout(async () => {
      mediaGroups.delete(groupId);

      // Обрабатываем альбом только если где-то в нём была команда !результа3
      if (!/^!результаты3/i.test(group.caption)) return;

      // Берём не больше MAX_IMAGES картинок, в порядке сообщений
      const sorted = group.photos
        .slice()
        .sort((a, b) => a.messageId - b.messageId)
        .slice(0, MAX_IMAGES);

      await processImagesArray(
        bot,
        group.chatId,
        sorted,
        group.firstMessageId
      );
    }, 800);
  });
};

/* ===================== ОБРАБОТКА МАССИВА КАРТИНОК ===================== */

async function processImagesArray(bot, chatId, items, replyToMessageId) {
  console.log('массив');
  if (!process.env.GEMINI_API_KEY) {
    return bot.sendMessage(chatId, '❌ Нет GEMINI_API_KEY', {
      reply_to_message_id: replyToMessageId,
    });
  }

  await bot.sendMessage(
    chatId,
    `⏳ Обрабатываю ${items.length} скрин(ов) через Gemini...`,
    { reply_to_message_id: replyToMessageId }
  );

  // сортируем по порядку сообщений (1-я страница → 2-я → 3-я)
  const sorted = [...items].sort((a, b) => a.messageId - b.messageId);

  const allTeams = [];

  for (const item of sorted) {
    try {
      const fileLink = await bot.getFileLink(item.fileId);
      const pageTeams = await extractTeamsFromImageUrl(fileLink);
      allTeams.push(...pageTeams);
    } catch (err) {
      console.error('Ошибка обработки скрина:', err);
      await bot.sendMessage(
        chatId,
        '⚠ Ошибка распознавания одного из скринов: ' + err.message,
        { reply_to_message_id: replyToMessageId }
      );
    }
  }

  if (!allTeams.length) {
    return bot.sendMessage(
      chatId,
      '❌ Не удалось распознать ни одной команды.',
      { reply_to_message_id: replyToMessageId }
    );
  }

  const sortedWithPts = calcAndSortTeams(allTeams);

  // Финальный JSON
  const json = JSON.stringify(sortedWithPts, null, 2);

  // Без parse_mode, чтобы не мучиться с экранированием
  return bot.sendMessage(chatId, json.slice(0, 3900), {
    reply_to_message_id: replyToMessageId,
  });
}
