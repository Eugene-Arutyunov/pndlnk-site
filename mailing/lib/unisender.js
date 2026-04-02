const axios = require('axios');

const BASE_URL = 'https://api.unisender.com/ru/api';

function config() {
  return {
    apiKey: process.env.UNISENDER_API_KEY,
    listId: process.env.UNISENDER_LIST_ID || '78',
    senderName: process.env.SENDER_NAME || 'ОКБ Понедельник',
    senderEmail: process.env.SENDER_EMAIL || 'okb@ponedelnik.ru',
    platform: 'pndlnk',
  };
}

async function apiCall(method, params) {
  const { apiKey, platform } = config();

  if (!apiKey) {
    throw new Error('UNISENDER_API_KEY не задан в .env');
  }

  const response = await axios.post(`${BASE_URL}/${method}`, null, {
    params: { format: 'json', api_key: apiKey, platform, ...params },
  });

  if (response.data.error) {
    throw new Error(`Unisender ошибка: ${response.data.error}`);
  }

  return response.data.result;
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
