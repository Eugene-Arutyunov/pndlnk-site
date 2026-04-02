const mjml = require('mjml');
const { marked } = require('marked');
const matter = require('gray-matter');
const fs = require('fs');
const path = require('path');

// Custom renderer: inline styles for email client compatibility
const renderer = {
  heading({ text, depth }) {
    const styles = {
      1: 'font-size:28px;font-weight:700;margin:0 0 16px;color:#232526;line-height:1.2;',
      2: 'font-size:22px;font-weight:700;margin:24px 0 12px;color:#232526;line-height:1.3;',
      3: 'font-size:18px;font-weight:700;margin:20px 0 10px;color:#232526;line-height:1.3;',
    };
    const style = styles[depth] || 'font-size:16px;font-weight:700;margin:16px 0 8px;color:#232526;';
    return `<h${depth} style="${style}">${text}</h${depth}>\n`;
  },
  paragraph({ text }) {
    return `<p style="margin:0 0 16px;color:#232526;font-size:16px;line-height:1.6;">${text}</p>\n`;
  },
  link({ href, text }) {
    return `<a href="${href}" style="color:#232526;text-decoration:underline;">${text}</a>`;
  },
  image({ href, text }) {
    return `<img src="${href}" alt="${text || ''}" style="max-width:100%;height:auto;display:block;margin:0 0 16px;border-radius:4px;" />\n`;
  },
  list({ body, ordered }) {
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag} style="padding-left:24px;margin:0 0 16px;">${body}</${tag}>\n`;
  },
  listitem({ text }) {
    return `<li style="margin-bottom:8px;color:#232526;font-size:16px;line-height:1.6;">${text}</li>\n`;
  },
  blockquote({ text }) {
    return `<blockquote style="border-left:3px solid #FF6969;margin:0 0 16px;padding:8px 16px;color:#666666;font-style:italic;">${text}</blockquote>\n`;
  },
  hr() {
    return `<hr style="border:none;border-top:1px solid #E6E4E4;margin:32px 0;" />\n`;
  },
  strong({ text }) {
    return `<strong style="font-weight:700;">${text}</strong>`;
  },
  em({ text }) {
    return `<em style="font-style:italic;">${text}</em>`;
  },
  code({ text }) {
    return `<pre style="background:#E6E4E4;padding:16px;border-radius:4px;overflow:auto;font-family:monospace;font-size:14px;margin:0 0 16px;"><code>${text}</code></pre>\n`;
  },
  codespan({ text }) {
    return `<code style="background:#E6E4E4;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:14px;">${text}</code>`;
  },
};

marked.use({ renderer });

function compile(contentFile) {
  const contentPath = path.resolve(contentFile);
  const raw = fs.readFileSync(contentPath, 'utf8');
  const { data: frontMatter, content: markdown } = matter(raw);

  const htmlContent = marked(markdown);

  const templatePath = path.resolve(__dirname, '../templates/digest.mjml');
  let template = fs.readFileSync(templatePath, 'utf8');

  template = template
    .replace('{{CONTENT}}', htmlContent)
    .replace('{{SUBJECT}}', frontMatter.subject || 'Дайджест Понедельника')
    .replace('{{PREHEADER}}', frontMatter.preheader || '');

  const { html, errors } = mjml(template, { validationLevel: 'soft' });

  if (errors.length) {
    errors.forEach((e) => console.warn('MJML:', e.message));
  }

  return { html, frontMatter };
}

module.exports = { compile };
