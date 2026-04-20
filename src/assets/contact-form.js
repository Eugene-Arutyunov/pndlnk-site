(function () {
  'use strict';

  const AIRTABLE_API_TOKEN = "patGs5l2YYQPM4Jcq.7f90034f164acb422bea9f978ac06f967e777579824617a95cbbb5965e8ab7f5";
  const AIRTABLE_BASE_ID = "appqTc6VQnPAPFDgk";
  const AIRTABLE_TABLE_ID = "Applications";

  const MESSAGES = {
    sending: "Отправляем...",
    success: "Отправилось, спасибо! Ответим в течение дня.",
    error: "Что-то пошло не так! Напишите нам: okb@ponedelnik.ru",
    validationError: "Пожалуйста, заполните имя и почту"
  };

  let overlay, popover, titleEl, subtitleEl, descriptionEl, form, extraEl,
      submitBtn, submitWrap, statusEl, headcountInput;
  let currentSuccessUrl = null;
  let currentSlug = null;

  function init() {
    overlay = document.getElementById('contact-form-overlay');
    if (!overlay) return;

    popover = overlay.querySelector('.contact-form-popover');
    titleEl = overlay.querySelector('.contact-form-title');
    subtitleEl = overlay.querySelector('.contact-form-subtitle');
    descriptionEl = overlay.querySelector('.contact-form-description');
    form = document.getElementById('contactForm');
    extraEl = overlay.querySelector('.contact-form-extra');
    submitBtn = overlay.querySelector('.contact-form-submit');
    submitWrap = overlay.querySelector('.submit-btn-wrap');
    statusEl = document.getElementById('cf-status');
    headcountInput = document.getElementById('cf-headcount');

    overlay.querySelector('.contact-form-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) close();
    });

    form.addEventListener('submit', handleSubmit);

    form.querySelectorAll('input').forEach(function (input) {
      input.closest('.form-field').addEventListener('click', function (e) {
        if (e.target !== input) input.focus();
      });
      input.addEventListener('blur', function () { validateField(input); });
      input.addEventListener('input', function () {
        input.closest('.form-field').classList.remove('form-field-error');
      });
    });

    document.querySelectorAll('.contact-form-trigger').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ContactForm.open({
          title: btn.dataset.cfTitle || '',
          tariff: btn.dataset.cfTariff || '',
          description: btn.dataset.cfDescription || '',
          submitText: btn.dataset.cfSubmit || 'Отправить',
          showHeadCount: btn.dataset.cfShowHeadcount === 'true',
          successUrl: btn.dataset.cfSuccessUrl || '',
          slug: btn.dataset.cfSlug || ''
        });
      });
    });
  }

  function open(options) {
    if (!overlay) return;

    titleEl.textContent = options.title || '';

    if (options.tariff) {
      subtitleEl.textContent = options.tariff;
      subtitleEl.hidden = false;
    } else {
      subtitleEl.hidden = true;
    }

    if (options.description) {
      descriptionEl.textContent = options.description;
      descriptionEl.hidden = false;
    } else {
      descriptionEl.hidden = true;
    }

    submitBtn.textContent = options.submitText || 'Отправить';

    if (options.showHeadCount) {
      extraEl.hidden = false;
      headcountInput.required = true;
    } else {
      extraEl.hidden = true;
      headcountInput.required = false;
    }

    currentSuccessUrl = options.successUrl || null;
    currentSlug = options.slug || null;

    resetForm();

    overlay.hidden = false;
    document.body.classList.add('contact-form-open');
    setTimeout(function () { overlay.classList.add('is-visible'); }, 10);

    const firstInput = form.querySelector('input');
    if (firstInput) firstInput.focus();
  }

  function close() {
    overlay.classList.remove('is-visible');
    setTimeout(function () {
      overlay.hidden = true;
      document.body.classList.remove('contact-form-open');
    }, 200);
  }

  function resetForm() {
    form.querySelectorAll('input').forEach(function (input) {
      input.value = '';
      input.disabled = false;
    });
    form.querySelectorAll('.form-field').forEach(function (f) {
      f.classList.remove('form-field-error');
    });
    submitWrap.style.width = '';
    submitWrap.classList.remove('is-hiding');
    setStatus('idle');
  }

  function validateField(input) {
    const field = input.closest('.form-field');
    field.classList.remove('form-field-error');
    if (!input.hasAttribute('required')) return true;
    const value = input.value.trim();
    if (input.type === 'email') {
      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        field.classList.add('form-field-error');
        return false;
      }
    } else if (input.type === 'number') {
      if (!value || parseInt(value) < 1) {
        field.classList.add('form-field-error');
        return false;
      }
    } else {
      if (!value) {
        field.classList.add('form-field-error');
        return false;
      }
    }
    return true;
  }

  function setStatus(state, message) {
    statusEl.classList.remove('status-sending', 'status-success', 'status-error');
    statusEl.textContent = '';
    submitBtn.disabled = false;
    form.querySelectorAll('input').forEach(function (i) { i.disabled = false; });

    if (state === 'sending') {
      submitBtn.disabled = true;
      form.querySelectorAll('input').forEach(function (i) { i.disabled = true; });
      statusEl.classList.add('status-sending');
      statusEl.textContent = message || MESSAGES.sending;
    } else if (state === 'success') {
      submitWrap.style.width = submitWrap.offsetWidth + 'px';
      requestAnimationFrame(function () {
        submitWrap.classList.add('is-hiding');
      });
      statusEl.classList.add('status-success');
      statusEl.textContent = message || MESSAGES.success;
    } else if (state === 'error') {
      statusEl.classList.add('status-error');
      statusEl.textContent = message || MESSAGES.error;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    let isValid = true;
    form.querySelectorAll('input').forEach(function (input) {
      if (!validateField(input)) isValid = false;
    });

    if (!isValid) {
      setStatus('error', MESSAGES.validationError);
      return;
    }

    setStatus('sending');

    const fields = {
      Name: document.getElementById('cf-name').value.trim(),
      Email: document.getElementById('cf-email').value.trim()
    };

    const company = document.getElementById('cf-company').value.trim();
    const telegram = document.getElementById('cf-telegram').value.trim();
    const headcount = headcountInput && !extraEl.hidden ? document.getElementById('cf-headcount').value.trim() : '';
    const product = titleEl.textContent.trim();
    const tariff = subtitleEl.hidden ? '' : subtitleEl.textContent.trim();

    if (company) fields.Company = company;
    if (telegram) fields.Telegram = telegram;
    if (headcount) fields['Head Count'] = parseInt(headcount);
    if (product) fields.Product = product;
    if (tariff) fields.Tariff = tariff;

    const leadData = {
      name: fields.Name,
      email: fields.Email,
      telegram: telegram,
      company: company,
      headcount: headcount || null,
      product: product || null,
      tariff: tariff || null,
      slug: currentSlug || null
    };

    try {
      const response = await fetch('https://apps.pndlnk.ru/webhook/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Ошибка ${response.status}`);
      }

      setStatus('success');

      // Бэкап в Airtable (раскомментировать чтобы включить)
      // const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_ID)}`;
      // fetch(airtableUrl, {
      //   method: 'POST',
      //   headers: {
      //     Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ records: [{ fields }] })
      // }).catch(function (err) { console.warn('Airtable backup error:', err); });

      if (currentSuccessUrl) {
        window.open(currentSuccessUrl, '_blank');
      }

      setTimeout(function () {
        if (!currentSuccessUrl) return;
        close();
      }, 2000);

    } catch (err) {
      console.error('Ошибка отправки:', err);
      setStatus('error', MESSAGES.error);
    }
  }

  const ContactForm = { open };
  window.ContactForm = ContactForm;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
