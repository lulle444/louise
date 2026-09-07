// Mobile nav toggle + contact form (mailto handoff, no backend).

const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const form = document.getElementById('kontakt-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const navn = data.get('navn') || '';
    const virksomhed = data.get('virksomhed') || '';
    const email = data.get('email') || '';
    const telefon = data.get('telefon') || '';
    const emne = data.get('emne') || '';
    const besked = data.get('besked') || '';

    const subject = `Henvendelse: ${emne}`;
    const body =
      `Navn: ${navn}\n` +
      `Virksomhed: ${virksomhed}\n` +
      `E-mail: ${email}\n` +
      `Telefon: ${telefon}\n` +
      `Emne: ${emne}\n\n` +
      `Besked:\n${besked}`;

    window.location.href =
      `mailto:jesper@secondopinion.dk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}
