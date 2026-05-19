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
const attachmentInput = document.querySelector('#attachments');
const fileList = document.querySelector('.file-list');

attachmentInput?.addEventListener('change', () => {
  if (!fileList) return;

  fileList.innerHTML = '';

  Array.from(attachmentInput.files || []).forEach((file) => {
    const item = document.createElement('li');
    item.textContent = file.name;
    fileList.appendChild(item);
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
}

function closeLightbox() {
  lightbox?.classList.remove('is-open');
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
