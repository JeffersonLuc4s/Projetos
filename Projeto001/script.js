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

// Gallery — auto-scroll infinito + setas + lightbox
(function () {
  const track = document.getElementById('galleryTrack');
  const origItems = Array.from(track.querySelectorAll('.gallery-item'));
  const origCount = origItems.length;

  // Guarda os dados originais pra o lightbox
  const galleryData = origItems.map(item => {
    const img = item.querySelector('img');
    return { src: img.src, label: img.alt };
  });

  // Atualiza onclick dos originais com índice
  origItems.forEach((item, i) => {
    item.querySelector('img').setAttribute('onclick', `openLightbox(${i})`);
  });

  // Clona os itens pra criar loop infinito
  origItems.forEach((item, i) => {
    const clone = item.cloneNode(true);
    clone.classList.add('gallery-clone');
    clone.querySelector('img').setAttribute('onclick', `openLightbox(${i})`);
    track.appendChild(clone);
  });

  // Auto-scroll
  let paused = false;
  const speed = 0.7; // px por frame

  function step() {
    if (!paused) {
      track.scrollLeft += speed;
      // Quando chega na metade (fim dos originais), volta pro início sem pular
      const half = track.scrollWidth / 2;
      if (track.scrollLeft >= half) {
        track.scrollLeft -= half;
      }
    }
    requestAnimationFrame(step);
  }

  track.addEventListener('mouseenter', () => paused = true);
  track.addEventListener('mouseleave', () => paused = false);
  requestAnimationFrame(step);

  // Setas manuais
  window.scrollGallery = function (dir) {
    paused = true;
    track.scrollBy({ left: dir * 380, behavior: 'smooth' });
    setTimeout(() => paused = false, 800);
  };

  // Lightbox
  let lightboxIndex = 0;

  window.openLightbox = function (index) {
    lightboxIndex = index;
    updateLightbox();
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeLightbox = function () {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
  };

  window.lightboxNav = function (dir) {
    lightboxIndex = (lightboxIndex + dir + origCount) % origCount;
    updateLightbox();
  };

  function updateLightbox() {
    const data = galleryData[lightboxIndex];
    document.getElementById('lightboxImg').src = data.src;
    document.getElementById('lightboxImg').alt = data.label;
    document.getElementById('lightboxLabel').textContent = data.label;
  }

  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('lightbox');
    if (!lb.classList.contains('active')) return;
    if (e.key === 'Escape') window.closeLightbox();
    if (e.key === 'ArrowLeft') window.lightboxNav(-1);
    if (e.key === 'ArrowRight') window.lightboxNav(1);
  });
})();

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
