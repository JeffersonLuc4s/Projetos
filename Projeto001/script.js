// Show login/cadastro on desktop
const lBtn = document.getElementById('loginBtn');
const cBtn = document.getElementById('cadastroBtn');

function updateAuthButtons() {
  if (window.innerWidth >= 1024) {
    lBtn.style.display = 'inline-flex';
    cBtn.style.display = 'inline-flex';
  } else {
    lBtn.style.display = 'none';
    cBtn.style.display = 'none';
  }
}
updateAuthButtons();
window.addEventListener('resize', updateAuthButtons);

// Mobile menu
const toggle = document.getElementById('menuToggle');
const mNav = document.getElementById('mobileNav');
toggle.addEventListener('click', () => {
  toggle.classList.toggle('active');
  mNav.classList.toggle('open');
});

function closeMenu() {
  toggle.classList.remove('active');
  mNav.classList.remove('open');
}

// Header scroll effect
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 50);
});

// Hero carousel
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.hero-dot');
let current = 0;
let heroInterval;

function showSlide(n) {
  slides.forEach((s, i) => s.classList.toggle('active', i === n));
  dots.forEach((d, i) => d.classList.toggle('active', i === n));
  current = n;
}

function nextSlide() {
  showSlide((current + 1) % slides.length);
}

dots.forEach(d => d.addEventListener('click', () => {
  showSlide(+d.dataset.slide);
  clearInterval(heroInterval);
  heroInterval = setInterval(nextSlide, 5000);
}));

heroInterval = setInterval(nextSlide, 5000);

// Stats counter
let statsCounted = false;
function countStats() {
  if (statsCounted) return;
  statsCounted = true;
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = +el.dataset.count;
    let c = 0;
    const step = Math.ceil(target / 60);
    const t = setInterval(() => {
      c += step;
      if (c >= target) { c = target; clearInterval(t); }
      const label = el.closest('.stat-item').querySelector('.stat-label').textContent;
      el.textContent = c + (label.includes('%') ? '%' : '+');
    }, 25);
  });
}

// Scroll reveal
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      if (e.target.closest('.stats')) countStats();
    }
  });
}, { threshold: 0.15 });
reveals.forEach(r => observer.observe(r));

// Depoimentos carousel
const depoTrack = document.getElementById('depoTrack');
let depoIndex = 0;

function getDepoVisible() {
  return window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;
}

function moveDepo(dir) {
  const total = document.querySelectorAll('.depo-slide').length;
  const vis = getDepoVisible();
  depoIndex = Math.max(0, Math.min(depoIndex + dir, total - vis));
  depoTrack.style.transform = `translateX(-${depoIndex * (100 / vis)}%)`;
}

let depoAuto = setInterval(() => {
  const total = document.querySelectorAll('.depo-slide').length;
  const vis = getDepoVisible();
  depoIndex = (depoIndex + 1) % (total - vis + 1);
  depoTrack.style.transform = `translateX(-${depoIndex * (100 / vis)}%)`;
}, 4000);

// Video placeholder
function loadVideo() {
  const w = document.querySelector('.video-wrapper');
  w.innerHTML = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" allow="autoplay;encrypted-media" allowfullscreen title="Vídeo institucional"></iframe>';
}

// Back to top
const backTop = document.getElementById('backTop');
window.addEventListener('scroll', () => {
  backTop.classList.toggle('show', window.scrollY > 400);
});

// Contact form
const contactForm = document.querySelector('.contato form, .contato .reveal');
if (contactForm) {
  const submitBtn = contactForm.querySelector('.btn-primary');
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
    });
  }
}
