const fs = require('fs');
const path = require('path');

function listFiles(bot) {
  bot.onText(/\/files/, (msg) => {
    const chatId = msg.chat.id;
    
    try {
      // Получаем список файлов и папок в корневой директории
      const items = fs.readdirSync('.', { withFileTypes: true });
      
      let message = '📁 *Список файлов проекта:*\n\n';
      
      // Сначала показываем папки
      const folders = items.filter(item => item.isDirectory() && !item.name.startsWith('.'));
      const files = items.filter(item => item.isFile() && !item.name.startsWith('.'));
      
      if (folders.length > 0) {
        message += '📂 *Папки:*\n';
        folders.forEach(folder => {
          message += `  └ 📁 ${folder.name}\n`;
        });
        message += '\n';
      }
      
      if (files.length > 0) {
        message += '📄 *Файлы:*\n';
        files.forEach(file => {
          const ext = path.extname(file.name);
          let icon = '📄';
          
          // Выбираем иконку в зависимости от типа файла
          if (ext === '.js') icon = '⚡';
          else if (ext === '.json') icon = '⚙️';
          else if (ext === '.md') icon = '📝';
          else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') icon = '🖼️';
          
          message += `  └ ${icon} ${file.name}\n`;
        });
      }
      
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Ошибка при получении списка файлов:', error);
      bot.sendMessage(chatId, '❌ Произошла ошибка при получении списка файлов.');
    }
  });
  
  // Команда для показа содержимого конкретной папки
  bot.onText(/\/folder (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const folderName = match[1];
    
    try {
      const folderPath = path.join('.', folderName);
      
      // Проверяем существование папки
      if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
        bot.sendMessage(chatId, `❌ Папка "${folderName}" не найдена.`);
        return;
      }
      
      const items = fs.readdirSync(folderPath, { withFileTypes: true });
      
      let message = `📁 *Содержимое папки "${folderName}":*\n\n`;
      
      if (items.length === 0) {
        message += '🚫 Папка пуста';
      } else {
        items.forEach(item => {
          if (item.isDirectory()) {
            message += `  └ 📁 ${item.name}/\n`;
          } else {
            const ext = path.extname(item.name);
            let icon = '📄';
            
            if (ext === '.js') icon = '⚡';
            else if (ext === '.json') icon = '⚙️';
            else if (ext === '.md') icon = '📝';
            else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') icon = '🖼️';
            
            message += `  └ ${icon} ${item.name}\n`;
          }
        });
      }
      
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Ошибка при получении содержимого папки:', error);
      bot.sendMessage(chatId, '❌ Произошла ошибка при получении содержимого папки.');
    }
  });
}

module.exports = listFiles;