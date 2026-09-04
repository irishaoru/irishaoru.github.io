const menuButton = document.querySelector('.menu-button');
const navLinks = document.querySelector('.nav-links');
menuButton?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealItems = document.querySelectorAll('.reveal');
if (reduceMotion) {
  revealItems.forEach(item => item.classList.add('visible'));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      makeRevealDust(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: .18 });
  revealItems.forEach(item => observer.observe(item));
}

function makeRevealDust(element) {
  const rect = element.getBoundingClientRect();
  for (let i = 0; i < 12; i++) {
    const dust = document.createElement('i');
    dust.className = 'reveal-spark';
    dust.style.left = `${rect.left + Math.random() * rect.width}px`;
    dust.style.top = `${rect.top + Math.random() * Math.min(rect.height, 180)}px`;
    dust.style.setProperty('--x', `${(Math.random() - .5) * 90}px`);
    dust.style.setProperty('--y', `${(Math.random() - .5) * 90}px`);
    document.body.appendChild(dust);
    setTimeout(() => dust.remove(), 1000);
  }
}

const fairyButton = document.querySelector('.fairy-toggle');
let fairyOn = localStorage.getItem('fairyDust') === 'on';
let lastSparkle = 0;
updateFairyButton();

fairyButton?.addEventListener('click', () => {
  fairyOn = !fairyOn;
  localStorage.setItem('fairyDust', fairyOn ? 'on' : 'off');
  updateFairyButton();
});

function updateFairyButton() {
  if (!fairyButton) return;
  fairyButton.setAttribute('aria-pressed', String(fairyOn));
  fairyButton.textContent = fairyOn ? '✦ Fairy dust: on' : '✦ Fairy dust: off';
}

document.addEventListener('pointermove', event => {
  if (!fairyOn || reduceMotion || Date.now() - lastSparkle < 45) return;
  lastSparkle = Date.now();
  const sparkle = document.createElement('span');
  sparkle.className = 'sparkle';
  sparkle.textContent = Math.random() > .5 ? '✦' : '·';
  sparkle.style.left = `${event.clientX}px`;
  sparkle.style.top = `${event.clientY}px`;
  sparkle.style.setProperty('--dx', `${(Math.random() - .5) * 36}px`);
  sparkle.style.setProperty('--dy', `${20 + Math.random() * 35}px`);
  document.body.appendChild(sparkle);
  setTimeout(() => sparkle.remove(), 750);
});

document.querySelector('.contact-form')?.addEventListener('submit', event => {
  event.preventDefault();
  const note = document.querySelector('.form-note');
  note.textContent = 'Form placeholder submitted — connect this form to your preferred email service before publishing.';
});

document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
