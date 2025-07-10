        // handlers/memberEventsHandler.js

        module.exports = function(bot, notifyChatId, threadMessageId) {
          // Отладочный обработчик для всех сообщений
          bot.on('message', (msg) => {
            if (msg.left_chat_member || msg.new_chat_members) {
              console.log('Получено событие с участниками:', JSON.stringify(msg, null, 2));
            }
          });
          // ✅ Новый участник
          bot.on('new_chat_members', (msg) => {
            msg.new_chat_members.forEach((user) => {
              const name = user.username
                ? `@${user.username}`
                : `${user.first_name} ${user.last_name || ''}`.trim();

              const message = `✅ Вступил в группу: ${name}`;

              bot.sendMessage(notifyChatId, message, {
                reply_to_message_id: threadMessageId
              });
            });
          });

          // 🚪 Участник покинул чат
          bot.on('left_chat_member', (msg) => {
            console.log('Событие left_chat_member:', msg);
            
            try {
              const user = msg.left_chat_member;
              
              if (!user) {
                console.log('Пользователь не найден в событии');
                return;
              }

              const name = user.username
                ? `@${user.username}`
                : `${user.first_name} ${user.last_name || ''}`.trim();

              const message = `🚪 Вышел из группы: ${name}`;
              console.log('Отправляем сообщение:', message);

              bot.sendMessage(notifyChatId, message, {
                reply_to_message_id: threadMessageId
              }).then(() => {
                console.log('Сообщение о выходе отправлено успешно');
              }).catch((error) => {
                console.error('Ошибка отправки сообщения:', error);
              });
            } catch (error) {
              console.error('Ошибка обработки события left_chat_member:', error);
            }
          }); 
          
        };
