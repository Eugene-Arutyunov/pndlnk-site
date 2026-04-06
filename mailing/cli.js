#!/usr/bin/env node
require('dotenv').config();

const [, , command, ...args] = process.argv;

const HELP = `
Использование: node cli.js <команда> [аргументы]

Команды:
  preview [файл.md]                    Предпросмотр с live reload
  test-send <email> [файл.md]          Тестовая отправка на адрес(а)
  send [файл.md] [--at "YYYY-MM-DD HH:mm"]  Отправка по списку
  ping                                  Проверить подключение к Unisender

Примеры:
  node cli.js preview
  node cli.js preview content/2024-01-15.md
  node cli.js test-send me@example.com
  node cli.js test-send me@example.com,other@example.com content/draft.md
  node cli.js send content/2024-01-15.md
  node cli.js send content/2024-01-15.md --at "2024-01-15 10:00"
`;

async function run() {
  switch (command) {
    case 'preview': {
      require('./lib/preview')(args);
      break;
    }

    case 'test-send': {
      const [emails, contentFile] = args;
      if (!emails) {
        console.error('Укажи email: node cli.js test-send email@example.com [файл.md]');
        process.exit(1);
      }

      const { compile } = require('./lib/compile');
      const { createMessage, testSend } = require('./lib/unisender');

      const file = contentFile || 'content/example.md';
      console.log(`Компилирую ${file}...`);
      const { html, frontMatter } = compile(file);

      console.log(`Создаю сообщение: "${frontMatter.subject}"...`);
      const result = await createMessage({ subject: frontMatter.subject, html });

      console.log(`Отправляю тест на: ${emails}...`);
      await testSend({ messageId: result.message_id, emails: emails.split(',') });

      console.log('✓ Тестовое письмо отправлено');
      break;
    }

    case 'send': {
      const atIdx = args.indexOf('--at');
      const startTime = atIdx !== -1 ? args[atIdx + 1] : null;
      const listIdx = args.indexOf('--list');
      const listId = listIdx !== -1 ? args[listIdx + 1] : null;
      const contentFile = args.find((a) => !a.startsWith('--') && a !== startTime && a !== listId);

      const { compile } = require('./lib/compile');
      const { createMessage, createCampaign } = require('./lib/unisender');

      const file = contentFile || 'content/example.md';
      console.log(`Компилирую ${file}...`);
      const { html, frontMatter } = compile(file);

      console.log(`Создаю сообщение: "${frontMatter.subject}"...`);
      const result = await createMessage({ subject: frontMatter.subject, html, listId });

      if (startTime) {
        console.log(`Планирую на: ${startTime}...`);
      } else {
        console.log('Отправляю немедленно...');
      }

      const campaign = await createCampaign({ messageId: result.message_id, startTime });
      console.log(`✓ Кампания запущена, ID: ${campaign.campaign_id}`);
      break;
    }

    case 'ping': {
      const { ping } = require('./lib/unisender');
      console.log('Проверяю подключение...');
      const lists = await ping();
      console.log('✓ Подключение работает. Списки:');
      lists.forEach((l) => console.log(`  [${l.id}] ${l.title}`));
      break;
    }

    default: {
      console.log(HELP);
      break;
    }
  }
}

run().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
