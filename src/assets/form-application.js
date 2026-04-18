// Форма заявок для КСЦ:ОИ

// Тексты сообщений формы (можно редактировать здесь)
window.FORM_MESSAGES = {
  sending: "Отправляем...",
  success: "Отправилось, спасибо! Ответим в течение дня.",
  error: "Что-то пошло не так! Напишите нам, пожалуйста: okb@ponedelnik.ru",
  validationError: "Пожалуйста, заполните имя и почту"
};

function initApplicationForm() {
  const form = document.getElementById("kscApplicationForm");
  if (!form) return;

  // Настройки Airtable API
  const AIRTABLE_API_TOKEN = "patGs5l2YYQPM4Jcq.7f90034f164acb422bea9f978ac06f967e777579824617a95cbbb5965e8ab7f5";
  const AIRTABLE_BASE_ID = "appqTc6VQnPAPFDgk";
  const AIRTABLE_TABLE_ID = "Applications";

  const submitBtn = document.getElementById("form-submit-btn");
  const statusDiv = document.getElementById("form-status");
  const formContainer = document.getElementById("form-container");
  const inputs = form.querySelectorAll("input");
  const fields = form.querySelectorAll(".form-field");

  // Валидация полей при blur
  function validateField(input) {
    const field = input.closest(".form-field");
    const isRequired = input.hasAttribute("required");
    const value = input.value.trim();

    // Убираем класс ошибки
    field.classList.remove("form-field-error");

    // Валидация только для обязательных полей
    if (isRequired) {
      if (input.type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value || !emailRegex.test(value)) {
          field.classList.add("form-field-error");
          return false;
        }
      } else {
        if (!value) {
          field.classList.add("form-field-error");
          return false;
        }
      }
    }

    return true;
  }

  // Добавляем обработчики blur для валидации и клика на поле
  inputs.forEach((input) => {
    const field = input.closest(".form-field");
    
    // Клик по полю фокусирует инпут
    field.addEventListener("click", (e) => {
      // Если клик не по самому инпуту, фокусируем его
      if (e.target !== input) {
        input.focus();
      }
    });

    input.addEventListener("blur", () => {
      validateField(input);
    });

    // Убираем ошибку при начале ввода
    input.addEventListener("input", () => {
      if (field.classList.contains("form-field-error")) {
        field.classList.remove("form-field-error");
      }
    });
  });

  function setFormState(state, message = "", keepFieldErrors = false) {
    // Убираем все состояния с контейнера
    formContainer.classList.remove("status-sending", "status-success", "status-error");
    statusDiv.classList.remove("status-sending", "status-success", "status-error");
    statusDiv.textContent = "";

    // Убираем ошибки с полей (если не указано сохранить их)
    if (!keepFieldErrors) {
      fields.forEach((field) => {
        field.classList.remove("form-field-error");
      });
    }

    switch (state) {
      case "idle":
        submitBtn.disabled = false;
        inputs.forEach((input) => (input.disabled = false));
        break;

      case "sending":
        submitBtn.disabled = true;
        inputs.forEach((input) => (input.disabled = true));
        formContainer.classList.add("status-sending");
        statusDiv.classList.add("status-sending");
        statusDiv.textContent = message || window.FORM_MESSAGES.sending;
        break;

      case "success":
        submitBtn.disabled = false;
        inputs.forEach((input) => {
          input.disabled = false;
          input.value = "";
        });
        formContainer.classList.add("status-success");
        statusDiv.classList.add("status-success");
        statusDiv.textContent = message || window.FORM_MESSAGES.success;
        // Скрываем сообщение через 5 секунд
        setTimeout(() => {
          formContainer.classList.remove("status-success");
          statusDiv.classList.remove("status-success");
          statusDiv.textContent = "";
        }, 5000);
        break;

      case "error":
        submitBtn.disabled = false;
        inputs.forEach((input) => (input.disabled = false));
        formContainer.classList.add("status-error");
        statusDiv.classList.add("status-error");
        statusDiv.textContent = message || window.FORM_MESSAGES.error;
        break;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Проверка конфигурации
    if (!AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      setFormState("error", "Ошибка конфигурации: не указаны Base ID или Table ID");
      console.error("Необходимо указать AIRTABLE_BASE_ID и AIRTABLE_TABLE_ID в form-application.js");
      return;
    }

    // Валидация всех обязательных полей перед отправкой
    let isValid = true;
    inputs.forEach((input) => {
      if (input.hasAttribute("required")) {
        if (!validateField(input)) {
          isValid = false;
        }
      }
    });

    if (!isValid) {
      setFormState("error", window.FORM_MESSAGES.validationError, true);
      return;
    }

    // Сбор данных формы
    const formData = {
      name: document.getElementById("form-name").value.trim(),
      company: document.getElementById("form-company").value.trim() || "",
      telegram: document.getElementById("form-telegram").value.trim() || "",
      email: document.getElementById("form-email").value.trim(),
    };

    // Подготовка данных для Airtable
    const airtableFields = {
      Name: formData.name,
      Email: formData.email,
    };

    // Добавляем необязательные поля только если они заполнены
    if (formData.company) {
      airtableFields.Company = formData.company;
    }
    if (formData.telegram) {
      airtableFields.Telegram = formData.telegram;
    }

    const airtableData = {
      records: [
        {
          fields: airtableFields,
        },
      ],
    };

    // URL для Airtable API
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_ID)}`;

    // Устанавливаем состояние отправки
    setFormState("sending");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(airtableData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || `Ошибка ${response.status}: ${response.statusText}`);
      }

      // Параллельно отправляем лид в CRM (не блокируем UX при ошибке)
      fetch("https://apps.pndlnk.ru/webhook/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      }).catch((err) => console.warn("CRM webhook error:", err));

      // Успешная отправка
      setFormState("success");
    } catch (error) {
      console.error("Ошибка отправки заявки:", error);
      setFormState("error", `Ошибка: ${error.message}`);
    }
  });
}

// Инициализируем форму когда DOM готов
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApplicationForm);
} else {
  initApplicationForm();
}

