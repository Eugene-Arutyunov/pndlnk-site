(function () {
  "use strict";

  const MESSAGES = {
    sending: "Отправляем...",
    success: "Отправилось, спасибо! Ответим в течение дня.",
    error: "Что-то пошло не так! Напишите нам: okb@ponedelnik.ru",
    validationError: "Пожалуйста, заполните имя и почту",
  };

  let overlay, titleEl, subtitleEl, descriptionEl, form, extraEl;
  let submitBtn, submitWrap, statusEl, headcountInput;
  let currentSuccessUrl = null;
  let currentSlug = null;

  function init() {
    overlay = document.getElementById("contact-form-overlay");
    if (!overlay) return;

    titleEl = overlay.querySelector(".contact-form-title");
    subtitleEl = overlay.querySelector(".contact-form-subtitle");
    descriptionEl = overlay.querySelector(".contact-form-description");
    form = document.getElementById("contactForm");
    extraEl = overlay.querySelector(".contact-form-extra");
    submitBtn = overlay.querySelector(".contact-form-submit");
    submitWrap = overlay.querySelector(".submit-btn-wrap");
    statusEl = document.getElementById("cf-status");
    headcountInput = document.getElementById("cf-headcount");

    overlay.querySelector(".contact-form-close").addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.hidden) close();
    });

    form.addEventListener("submit", handleSubmit);

    form.querySelectorAll("input").forEach(function (input) {
      input.closest(".form-field").addEventListener("click", function (e) {
        if (e.target !== input) input.focus();
      });
      input.addEventListener("blur", function () {
        validateField(input);
      });
      input.addEventListener("input", function () {
        input.closest(".form-field").classList.remove("form-field-error");
      });
    });

    document.querySelectorAll(".contact-form-trigger").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ContactForm.open({
          title: btn.dataset.cfTitle || "",
          tariff: btn.dataset.cfTariff || "",
          description: btn.dataset.cfDescription || "",
          submitText: btn.dataset.cfSubmit || "Отправить",
          showHeadCount: btn.dataset.cfShowHeadcount === "true",
          successUrl: btn.dataset.cfSuccessUrl || "",
          slug: btn.dataset.cfSlug || "",
        });
      });
    });
  }

  function open(options) {
    if (!overlay) return;

    titleEl.textContent = options.title || "";

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

    submitBtn.textContent = options.submitText || "Отправить";

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
    document.body.classList.add("contact-form-open");
    setTimeout(function () {
      overlay.classList.add("is-visible");
    }, 10);

    const firstInput = form.querySelector("input");
    if (firstInput) firstInput.focus();
  }

  function close() {
    overlay.classList.remove("is-visible");
    setTimeout(function () {
      overlay.hidden = true;
      document.body.classList.remove("contact-form-open");
    }, 200);
  }

  function resetForm() {
    form.querySelectorAll("input").forEach(function (input) {
      input.value = "";
      input.disabled = false;
    });
    form.querySelectorAll(".form-field").forEach(function (f) {
      f.classList.remove("form-field-error");
    });
    submitWrap.style.width = "";
    submitWrap.classList.remove("is-hiding");
    setStatus("idle");
  }

  function validateField(input) {
    const field = input.closest(".form-field");
    field.classList.remove("form-field-error");
    if (!input.hasAttribute("required")) return true;
    const value = input.value.trim();
    if (input.type === "email") {
      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        field.classList.add("form-field-error");
        return false;
      }
    } else if (input.type === "number") {
      if (!value || parseInt(value, 10) < 1) {
        field.classList.add("form-field-error");
        return false;
      }
    } else if (!value) {
      field.classList.add("form-field-error");
      return false;
    }
    return true;
  }

  function setStatus(state, message) {
    statusEl.classList.remove("status-sending", "status-success", "status-error");
    statusEl.textContent = "";
    submitBtn.disabled = false;
    form.querySelectorAll("input").forEach(function (i) {
      i.disabled = false;
    });

    if (state === "sending") {
      submitBtn.disabled = true;
      form.querySelectorAll("input").forEach(function (i) {
        i.disabled = true;
      });
      statusEl.classList.add("status-sending");
      statusEl.textContent = message || MESSAGES.sending;
    } else if (state === "success") {
      submitWrap.style.width = submitWrap.offsetWidth + "px";
      requestAnimationFrame(function () {
        submitWrap.classList.add("is-hiding");
      });
      statusEl.classList.add("status-success");
      statusEl.textContent = message || MESSAGES.success;
    } else if (state === "error") {
      statusEl.classList.add("status-error");
      statusEl.textContent = message || MESSAGES.error;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    let isValid = true;
    form.querySelectorAll("input").forEach(function (input) {
      if (!validateField(input)) isValid = false;
    });

    if (!isValid) {
      setStatus("error", MESSAGES.validationError);
      return;
    }

    setStatus("sending");

    const leadData = {
      name: document.getElementById("cf-name").value.trim(),
      email: document.getElementById("cf-email").value.trim(),
      telegram: document.getElementById("cf-telegram").value.trim(),
      company: document.getElementById("cf-company").value.trim(),
      headcount:
        headcountInput && !extraEl.hidden
          ? document.getElementById("cf-headcount").value.trim() || null
          : null,
      product: titleEl.textContent.trim() || null,
      tariff: subtitleEl.hidden ? null : subtitleEl.textContent.trim(),
      slug: currentSlug || null,
    };

    try {
      const response = await fetch("https://apps.pndlnk.ru/webhook/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Ошибка ${response.status}`);
      }

      setStatus("success");

      if (currentSuccessUrl) {
        window.open(currentSuccessUrl, "_blank");
      }

      setTimeout(function () {
        if (!currentSuccessUrl) return;
        close();
      }, 2000);
    } catch (err) {
      console.error("Ошибка отправки:", err);
      setStatus("error", MESSAGES.error);
    }
  }

  const ContactForm = { open: open };
  window.ContactForm = ContactForm;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
