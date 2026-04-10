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

function parseResponse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Не удалось распарсить ответ: ' + raw.substring(0, 200));
  }
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => { try { resolve(parseResponse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// multipart/form-data — не URL-кодирует бинарные данные и большой текст
function postMultipart(url, fields, filePart = null) {
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const parts = Object.entries(fields).map(([name, value]) =>
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`
  );
  let bodyBuf;
  if (filePart) {
    const header = parts.join('\r\n') + `\r\n--${boundary}\r\nContent-Disposition: form-data; name="${filePart.fieldName}"; filename="${filePart.filename}"\r\nContent-Type: ${filePart.contentType}\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    bodyBuf = Buffer.concat([Buffer.from(header, 'utf8'), filePart.data, Buffer.from(footer, 'utf8')]);
  } else {
    const body = parts.join('\r\n') + `\r\n--${boundary}--\r\n`;
    bodyBuf = Buffer.from(body, 'utf8');
  }
  const urlObj = new URL(url);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuf.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => { try { resolve(parseResponse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

async function apiCall(method, params, useMultipart = false) {
  const { apiKey } = config();

  if (!apiKey) {
    throw new Error('UNISENDER_API_KEY не задан в .env');
  }

  const allParams = { format: 'json', api_key: apiKey, ...params };
  const url = `${BASE_URL}/${method}`;

  const data = useMultipart
    ? await postMultipart(url, allParams)
    : await get(`${url}?${querystring.stringify(allParams)}`);

  if (data.error) {
    throw new Error(`Unisender ошибка: ${data.error}`);
  }

  return data.result;
}

// Создать сообщение в Unisender
async function createMessage({ subject, html, listId: listIdOverride }) {
  const { senderName, senderEmail, listId: listIdDefault } = config();
  const listId = listIdOverride || listIdDefault;
  return apiCall('createEmailMessage', {
    sender_name: senderName,
    sender_email: senderEmail,
    subject,
    body: html,
    list_id: listId,
    lang: 'ru',
  }, true); // multipart для большого HTML
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

// Загрузить файл на CDN Unisender, вернуть публичный URL
async function uploadFile(filePath) {
  const fs = require('fs');
  const path = require('path');
  const { apiKey } = config();
  if (!apiKey) throw new Error('UNISENDER_API_KEY не задан в .env');

  const data = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  const ext = path.extname(filename).slice(1).toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';

  // api_key и format передаём в query string, файл — в multipart body
  const url = `${BASE_URL}/uploadFile?format=json&api_key=${encodeURIComponent(apiKey)}`;
  const result = await postMultipart(
    url,
    {},
    { fieldName: 'file', filename, contentType, data }
  );

  if (result.error) throw new Error(`Unisender ошибка: ${result.error}`);
  return result.result.uploaded[0];
}

module.exports = { createMessage, testSend, createCampaign, ping, uploadFile };
