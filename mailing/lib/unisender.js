const https = require('https');
const querystring = require('querystring');

const BASE_URL = 'https://api.unisender.com/ru/api';

function config() {
  return {
    apiKey: process.env.UNISENDER_API_KEY,
    listId: process.env.UNISENDER_LIST_ID || '78',
    senderName: process.env.SENDER_NAME || 'ОКБ Понедельник',
    senderEmail: process.env.SENDER_EMAIL || 'okb@ponedelnik.ru',
  };
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Не удалось распарсить ответ: ' + data.substring(0, 200)));
        }
      });
    }).on('error', reject);
  });
}

async function apiCall(method, params) {
  const { apiKey } = config();

  if (!apiKey) {
    throw new Error('UNISENDER_API_KEY не задан в .env');
  }

  const qs = querystring.stringify({ format: 'json', api_key: apiKey, ...params });
  const url = `${BASE_URL}/${method}?${qs}`;

  const data = await get(url);

  if (data.error) {
    throw new Error(`Unisender ошибка: ${data.error}`);
  }

  return data.result;
}

// Создать сообщение в Unisender (нужно для test-send и send)
async function createMessage({ subject, html }) {
  const { senderName, senderEmail, listId } = config();
  return apiCall('createEmailMessage', {
    sender_name: senderName,
    sender_email: senderEmail,
    subject,
    body: html,
    list_id: listId,
    lang: 'ru',
  });
}

// Тестовая отправка по message_id
async function testSend({ messageId, emails }) {
  return apiCall('sendTestEmail', {
    id: messageId,
    email: Array.isArray(emails) ? emails.join(',') : emails,
  });
}

// Запустить кампанию по всему списку
async function createCampaign({ messageId, startTime }) {
  const params = { message_id: messageId };
  if (startTime) {
    params.start_time = startTime; // формат: 'YYYY-MM-DD HH:mm'
  }
  return apiCall('createCampaign', params);
}

// Проверить подключение
async function ping() {
  return apiCall('getLists', {});
}

module.exports = { createMessage, testSend, createCampaign, ping };
