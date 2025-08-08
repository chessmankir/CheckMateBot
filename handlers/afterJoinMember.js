const db = require('./db');
const getPlayerDescription = require('./../db/getDescriptionDb');

const admins = [
  '@nurka7',
  '@chessmankir',
  '@winepubgm'
]

module.exports = function (bot) {
  bot.on('new_chat_members', async (msg) => {
    const chatId = msg.chat.id;

    for (const newUser of msg.new_chat_members) {
      const actorId = newUser.id;

      try {
        // Проверяем наличие пользователя в базе
        const memberRes = await db.query(
          `SELECT clan FROM clan_members WHERE actor_id = $1 AND active = TRUE LIMIT 1`,
          [actorId]
        );

        if (memberRes.rowCount === 0) {
          // Не найден в базе — игнорируем
          return;
        }

        const clan = memberRes.rows[0].clan;

        if (clan > 3 || clan < 0){
          return;
        }
        console.log(clan);
        const admin  =  await getPlayerDescription(admins[clan - 1]);
        console.log(admins[clan - 1]);
        console.log(admin);
        if ( admin == null){
          return;
        }

        // Сообщение в личку
        const welcomeMessage = `
👋 Здравствуйте, ${newUser.first_name}!
Добро пожаловать в клан Checkmate.  
Пожалуйста, ознакомься с нашими правилами. Напишите в чат клана слово "Правила" без кавычек `.trim();
       // Пишем в ЛС
        await bot.sendMessage(actorId, welcomeMessage, {
          parse_mode: 'Markdown'
        });
      const welcomeMessage1 = `Для вступелния в клан в игре найдите профиль лидера клана и подайте заявку`;
        await bot.sendMessage(actorId, welcomeMessage1, {
          parse_mode: 'Markdown'
        });

        const response = `
        📄 Описание игрока ${admins[clan - 1]}:

 👤 Имя: ${admin.name}
 🏷 Ник: ${admin.nick}
 🎮 PUBG ID: ${admin.pubgId}
 🎂 Возраст: ${admin.age}
 📍 Город: ${admin.city}
              `.trim();
              bot.sendMessage(actorId, response, {
                parse_mode: 'Markdown',
              });

      } catch (error) {
        console.error('❌ Ошибка при обработке нового участника:', error);
      }
    }
  });
};
