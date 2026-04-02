const express = require('express');
const chokidar = require('chokidar');
const path = require('path');
const open = require('open');
const { compile } = require('./compile');

const PORT = 3333;
const DEFAULT_CONTENT = path.resolve(__dirname, '../content/example.md');
const TEMPLATE = path.resolve(__dirname, '../templates/digest.mjml');

module.exports = function preview([contentFile] = []) {
  const file = path.resolve(contentFile || DEFAULT_CONTENT);
  let compiled = '';
  let lastError = '';

  function recompile() {
    try {
      const { html } = compile(file);
      compiled = html;
      lastError = '';
      console.log('✓ Перекомпилировано');
    } catch (e) {
      lastError = e.message;
      console.error('✗ Ошибка:', e.message);
    }
  }

  recompile();

  const app = express();
  const clients = new Set();

  // SSE для live reload
  app.get('/__sse', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    clients.add(res);
    req.on('close', () => clients.delete(res));
  });

  app.get('/', (req, res) => {
    if (lastError) {
      return res.send(`<pre style="padding:24px;color:red;font-family:monospace;">${lastError}</pre>`);
    }

    const liveReloadScript = `
<script>
  const es = new EventSource('/__sse');
  es.onmessage = () => location.reload();
</script>`;

    res.send(compiled.replace('</body>', liveReloadScript + '</body>'));
  });

  chokidar.watch([file, TEMPLATE]).on('change', (changed) => {
    console.log(`Изменился: ${path.basename(changed)}`);
    recompile();
    clients.forEach((c) => c.write('data: reload\n\n'));
  });

  app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\nПредпросмотр: ${url}`);
    console.log(`Файл: ${file}\n`);
    open(url);
  });
};
