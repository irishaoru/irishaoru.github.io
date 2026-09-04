const menuButton = document.querySelector('.menu-button');
const navLinks = document.querySelector('.nav-links');
menuButton?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

const pageSections = document.querySelectorAll('.scroll-section');
const sectionLinks = document.querySelectorAll('.nav-links a[href^="#"]');
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-25% 0px -60% 0px' });
  pageSections.forEach(section => sectionObserver.observe(section));
}

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

// A subtle pointer-following tilt gives project cards depth on desktop.
if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--tilt-x', `${(0.5 - y) * 7}deg`);
      card.style.setProperty('--tilt-y', `${(x - 0.5) * 7}deg`);
      card.style.setProperty('--shine-x', `${x * 100}%`);
      card.style.setProperty('--shine-y', `${y * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--shine-x', '50%');
      card.style.setProperty('--shine-y', '50%');
    });
  });
}
