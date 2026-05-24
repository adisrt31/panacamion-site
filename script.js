const toggle = document.querySelector(".nav-toggle");
const menuLinks = document.querySelectorAll(".nav-menu a");
const backdrop = document.querySelector(".nav-backdrop");

function setMenu(open) {
  document.body.classList.toggle("nav-open", open);
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "×" : "☰";
  }
}

setMenu(false);

toggle?.addEventListener("click", () => {
  setMenu(!document.body.classList.contains("nav-open"));
});

backdrop?.addEventListener("click", () => setMenu(false));

menuLinks.forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

window.addEventListener("resize", () => setMenu(false));
document.querySelectorAll('[data-gallery]').forEach((gallery) => {
  const slides = gallery.querySelectorAll('.gallery-slide');
  const dots = gallery.querySelectorAll('.gallery-dot');

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle('is-active', slideIndex === index);
      });
      dots.forEach((item, dotIndex) => {
        item.classList.toggle('is-active', dotIndex === index);
      });
    });
  });
});
document.querySelectorAll('.upload-zone input[type="file"]').forEach((attachmentInput) => {
  attachmentInput.addEventListener('change', () => {
    const uploadLabel = attachmentInput.closest('label');
    const fileList = uploadLabel?.nextElementSibling?.classList.contains('file-list')
      ? uploadLabel.nextElementSibling
      : null;

    if (!fileList) return;

    fileList.innerHTML = '';

    Array.from(attachmentInput.files || []).forEach((file) => {
      const item = document.createElement('li');
      item.textContent = file.name;
      fileList.appendChild(item);
    });

    clearFieldError(attachmentInput);
  });
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const id = anchor.getAttribute('href');
    if (!id || id === '#') return;

    const target = document.querySelector(id);
    if (!target) return;

    event.preventDefault();
    setMenu(false);

    const header = document.querySelector('.site-header');
    const headerHeight = header ? header.offsetHeight : 0;
    const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight + 62;

    window.scrollTo({ top, behavior: 'smooth' });
    history.pushState(null, '', id);
  });
});

const lightbox = document.querySelector('.image-lightbox');
const lightboxImage = document.querySelector('.image-lightbox img');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxPrev = document.querySelector('.lightbox-prev');
const lightboxNext = document.querySelector('.lightbox-next');
let lightboxSlides = [];
let lightboxIndex = 0;

function showLightboxImage(index) {
  if (!lightboxImage || !lightboxSlides.length) return;

  lightboxIndex = (index + lightboxSlides.length) % lightboxSlides.length;
  const image = lightboxSlides[lightboxIndex];
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt;
  lightbox?.classList.toggle('is-product-zoom', Boolean(image.productZoom));
}

function closeLightbox() {
  lightbox?.classList.remove('is-open');
  lightbox?.classList.remove('is-product-zoom');
  lightbox?.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll('.gallery-track').forEach((track) => {
  track.addEventListener('click', () => {
    const slides = Array.from(track.querySelectorAll('.gallery-slide'));
    const activeIndex = slides.findIndex((slide) => slide.classList.contains('is-active'));
    if (!slides.length || !lightbox) return;

    lightboxSlides = slides;
    showLightboxImage(activeIndex >= 0 ? activeIndex : 0);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
  });
});

lightboxPrev?.addEventListener('click', () => showLightboxImage(lightboxIndex - 1));
lightboxNext?.addEventListener('click', () => showLightboxImage(lightboxIndex + 1));
lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeLightbox();
  if (lightbox?.classList.contains('is-open') && event.key === 'ArrowLeft') showLightboxImage(lightboxIndex - 1);
  if (lightbox?.classList.contains('is-open') && event.key === 'ArrowRight') showLightboxImage(lightboxIndex + 1);
});

const siteHeader = document.querySelector('.site-header');

function updateHeaderScrollState() {
  siteHeader?.classList.toggle('is-scrolled', window.scrollY > 18);
}

updateHeaderScrollState();
window.addEventListener('scroll', updateHeaderScrollState, { passive: true });

document.querySelectorAll('[data-open-image]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!lightbox) return;

    const defaultImage = button.getAttribute('data-open-image');
    const mobileImage = button.getAttribute('data-mobile-image');
    const imageSrc = mobileImage && window.matchMedia('(max-width: 700px)').matches
      ? mobileImage
      : defaultImage;

    lightboxSlides = [{
      src: imageSrc,
      alt: button.getAttribute('data-image-alt') || 'Imagen ampliada',
      productZoom: true
    }];
    showLightboxImage(0);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
  });
});

const requestForm = document.querySelector('.premium-request-form');
const requestTabs = document.querySelectorAll('[data-request-tab]');
const requestPanels = document.querySelectorAll('[data-request-panel]');
const requestPathValue = document.querySelector('[data-request-path-value]');

function syncRequestPanels(activePath) {
  requestTabs.forEach((tab) => {
    const isActive = tab.dataset.requestTab === activePath;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  requestPanels.forEach((panel) => {
    const isActive = panel.dataset.requestPanel === activePath;
    panel.classList.toggle('is-active', isActive);
    panel.hidden = !isActive;
    panel.querySelectorAll('input, select, textarea').forEach((field) => {
      field.disabled = !isActive;
      if (!isActive) clearFieldError(field);
    });
  });

  if (requestPathValue) {
    requestPathValue.value = activePath === 'repuestos' ? 'Solicitud de repuestos' : 'Solicitud de unidades';
  }
}

function getFieldLabel(field) {
  return field.closest('label');
}

function ensureErrorNode(label) {
  let error = label?.querySelector('.field-error');
  if (!error && label) {
    error = document.createElement('small');
    error.className = 'field-error';
    error.textContent = 'Este campo es requerido.';
    label.appendChild(error);
  }
  return error;
}

function setFieldError(field, message) {
  const label = getFieldLabel(field);
  if (!label) return;

  label.classList.add('has-error');
  const error = ensureErrorNode(label);
  if (error) error.textContent = message;
}

function clearFieldError(field) {
  const label = getFieldLabel(field);
  label?.classList.remove('has-error');
}

requestTabs.forEach((tab) => {
  tab.addEventListener('click', () => syncRequestPanels(tab.dataset.requestTab));
});

syncRequestPanels('unidades');

requestForm?.querySelectorAll('[data-required]').forEach((field) => {
  field.addEventListener('input', () => clearFieldError(field));
  field.addEventListener('change', () => clearFieldError(field));
});

requestForm?.addEventListener('submit', (event) => {
  const status = requestForm.querySelector('.form-status');
  const requiredFields = Array.from(requestForm.querySelectorAll('[data-required]'))
    .filter((field) => !field.disabled && !field.closest('[hidden]'));
  let firstInvalid = null;

  requiredFields.forEach((field) => {
    clearFieldError(field);
    const value = String(field.value || '').trim();
    if ((field.type === 'file' && (!field.files || field.files.length === 0)) || (field.type !== 'file' && !value)) {
      setFieldError(field, 'Este campo es requerido.');
      firstInvalid ||= field;
      return;
    }

    if (field.type === 'email' && !field.checkValidity()) {
      setFieldError(field, 'Ingrese un correo válido.');
      firstInvalid ||= field;
    }
  });

  if (firstInvalid) {
    event.preventDefault();
    status.textContent = 'Complete los campos marcados en rojo para enviar la solicitud.';
    const header = document.querySelector('.site-header');
    const offset = header ? header.offsetHeight + 24 : 80;
    window.scrollTo({
      top: firstInvalid.getBoundingClientRect().top + window.pageYOffset - offset,
      behavior: 'smooth'
    });
    if (firstInvalid.type === 'hidden' && firstInvalid.matches('[data-country-code]')) {
      countryTrigger?.focus({ preventScroll: true });
      openCountryMenu();
    } else {
      firstInvalid.focus({ preventScroll: true });
    }
    return;
  }

  status.textContent = '';
  if (requestForm.getAttribute('action') === '#') {
    event.preventDefault();
    status.textContent = 'Solicitud lista para enviar cuando se conecte el servicio de formulario.';
  }
});

const countryCombobox = document.querySelector('[data-country-combobox]');
const countryTrigger = countryCombobox?.querySelector('.country-trigger');
const countryMenu = countryCombobox?.querySelector('.country-menu');
const countrySearch = countryCombobox?.querySelector('.country-search');
const countryOptions = countryCombobox?.querySelector('.country-options');
const countryCodeInput = countryCombobox?.querySelector('[data-country-code]');
const phoneFlag = countryCombobox?.querySelector('.phone-flag');
const countryCodeLabel = countryCombobox?.querySelector('.country-code-label');

const americasCountries = [
  { name: 'Anguila', code: '+1-264', flag: '🇦🇮' },
  { name: 'Antigua y Barbuda', code: '+1-268', flag: '🇦🇬' },
  { name: 'Argentina', code: '+54', flag: '🇦🇷' },
  { name: 'Aruba', code: '+297', flag: '🇦🇼' },
  { name: 'Bahamas', code: '+1-242', flag: '🇧🇸' },
  { name: 'Barbados', code: '+1-246', flag: '🇧🇧' },
  { name: 'Belice', code: '+501', flag: '🇧🇿' },
  { name: 'Bermuda', code: '+1-441', flag: '🇧🇲' },
  { name: 'Bolivia', code: '+591', flag: '🇧🇴' },
  { name: 'Brasil', code: '+55', flag: '🇧🇷' },
  { name: 'Bonaire', code: '+599', flag: '🇧🇶' },
  { name: 'Canadá', code: '+1', flag: '🇨🇦' },
  { name: 'Chile', code: '+56', flag: '🇨🇱' },
  { name: 'Colombia', code: '+57', flag: '🇨🇴' },
  { name: 'Costa Rica', code: '+506', flag: '🇨🇷' },
  { name: 'Cuba', code: '+53', flag: '🇨🇺' },
  { name: 'Curazao', code: '+599', flag: '🇨🇼' },
  { name: 'Dominica', code: '+1-767', flag: '🇩🇲' },
  { name: 'Ecuador', code: '+593', flag: '🇪🇨' },
  { name: 'El Salvador', code: '+503', flag: '🇸🇻' },
  { name: 'Estados Unidos', code: '+1', flag: '🇺🇸' },
  { name: 'Granada', code: '+1-473', flag: '🇬🇩' },
  { name: 'Groenlandia', code: '+299', flag: '🇬🇱' },
  { name: 'Guadalupe', code: '+590', flag: '🇬🇵' },
  { name: 'Guatemala', code: '+502', flag: '🇬🇹' },
  { name: 'Guayana Francesa', code: '+594', flag: '🇬🇫' },
  { name: 'Guyana', code: '+592', flag: '🇬🇾' },
  { name: 'Haití', code: '+509', flag: '🇭🇹' },
  { name: 'Honduras', code: '+504', flag: '🇭🇳' },
  { name: 'Islas Caimán', code: '+1-345', flag: '🇰🇾' },
  { name: 'Islas Malvinas', code: '+500', flag: '🇫🇰' },
  { name: 'Islas Turcas y Caicos', code: '+1-649', flag: '🇹🇨' },
  { name: 'Islas Vírgenes Británicas', code: '+1-284', flag: '🇻🇬' },
  { name: 'Islas Vírgenes de EE. UU.', code: '+1-340', flag: '🇻🇮' },
  { name: 'Jamaica', code: '+1-876', flag: '🇯🇲' },
  { name: 'Martinica', code: '+596', flag: '🇲🇶' },
  { name: 'México', code: '+52', flag: '🇲🇽' },
  { name: 'Montserrat', code: '+1-664', flag: '🇲🇸' },
  { name: 'Nicaragua', code: '+505', flag: '🇳🇮' },
  { name: 'Panamá', code: '+507', flag: '🇵🇦' },
  { name: 'Paraguay', code: '+595', flag: '🇵🇾' },
  { name: 'Perú', code: '+51', flag: '🇵🇪' },
  { name: 'Puerto Rico', code: '+1-787', flag: '🇵🇷' },
  { name: 'República Dominicana', code: '+1-809', flag: '🇩🇴' },
  { name: 'San Bartolomé', code: '+590', flag: '🇧🇱' },
  { name: 'Saba', code: '+599', flag: '🇧🇶' },
  { name: 'San Cristóbal y Nieves', code: '+1-869', flag: '🇰🇳' },
  { name: 'San Eustaquio', code: '+599', flag: '🇧🇶' },
  { name: 'San Martín', code: '+590', flag: '🇲🇫' },
  { name: 'San Pedro y Miquelón', code: '+508', flag: '🇵🇲' },
  { name: 'San Vicente y las Granadinas', code: '+1-784', flag: '🇻🇨' },
  { name: 'Santa Lucía', code: '+1-758', flag: '🇱🇨' },
  { name: 'Sint Maarten', code: '+1-721', flag: '🇸🇽' },
  { name: 'Surinam', code: '+597', flag: '🇸🇷' },
  { name: 'Trinidad y Tobago', code: '+1-868', flag: '🇹🇹' },
  { name: 'Uruguay', code: '+598', flag: '🇺🇾' },
  { name: 'Venezuela', code: '+58', flag: '🇻🇪' }
].sort((a, b) => a.name.localeCompare(b.name, 'es'));

function renderCountryOptions(filter = '') {
  if (!countryOptions) return;

  const query = filter.trim().toLowerCase();
  const visibleCountries = americasCountries.filter((country) => {
    const text = `${country.name} ${country.code}`.toLowerCase();
    return text.includes(query);
  });

  countryOptions.innerHTML = '';
  visibleCountries.forEach((country) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'country-option';
    option.setAttribute('role', 'option');
    option.innerHTML = `<span>${country.flag}</span><strong>${country.name}</strong><em>${country.code}</em>`;
    option.addEventListener('click', () => selectCountry(country));
    countryOptions.appendChild(option);
  });
}

function openCountryMenu() {
  if (!countryMenu || !countryTrigger) return;
  countryMenu.hidden = false;
  countryTrigger.setAttribute('aria-expanded', 'true');
  renderCountryOptions(countrySearch?.value || '');
  setTimeout(() => countrySearch?.focus(), 0);
}

function closeCountryMenu() {
  if (!countryMenu || !countryTrigger) return;
  countryMenu.hidden = true;
  countryTrigger.setAttribute('aria-expanded', 'false');
}

function selectCountry(country) {
  if (countryCodeInput) countryCodeInput.value = country.code;
  if (phoneFlag) phoneFlag.textContent = country.flag;
  if (countryCodeLabel) countryCodeLabel.textContent = `${country.name} ${country.code}`;
  clearFieldError(countryCodeInput);
  closeCountryMenu();
}

countryTrigger?.addEventListener('click', () => {
  if (countryMenu?.hidden) openCountryMenu();
  else closeCountryMenu();
});

countrySearch?.addEventListener('input', () => renderCountryOptions(countrySearch.value));

document.addEventListener('click', (event) => {
  if (!countryCombobox?.contains(event.target)) closeCountryMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeCountryMenu();
});

renderCountryOptions();
