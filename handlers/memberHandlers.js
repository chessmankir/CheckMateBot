        // handlers/memberEventsHandler.js

        module.exports = function(bot, notifyChatId, threadMessageId) {
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
            console.log('вышел из сата');
            const user = msg.left_chat_member;

            const name = user.username
              ? `@${user.username}`
              : `${user.first_name} ${user.last_name || ''}`.trim();

            const message = `🚪 Вышел из группы: ${name}`;
            console.log(message);

            bot.sendMessage(notifyChatId, message, {
              reply_to_message_id: threadMessageId
            });
          }); 
          
        };
