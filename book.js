export class Book {
  constructor(containerId, pagesData) {
    this.bookEl = document.getElementById(containerId);
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.bgMusic = document.getElementById('bgMusic');
    this.pagesData = pagesData;
    
    this.currentPage = 0;
    this.pages = [];
    this.isAnimating = false;
    this.typewriterIntervals = new Map();

    this.audioCtx = null;
    this.paperSoundBuffer = null;

    this.init();
  }

  async init() {
    this.renderStaticLeftCover();
    this.renderPages();
    this.updateZIndexes();
    this.bindEvents();
    this.setupBackgroundMusic();
    await this.setupAudio();
  }

  setupBackgroundMusic() {
    const welcomeOverlay = document.getElementById('welcomeOverlay');
    const entryBtn = document.getElementById('entryBtn');

    if (entryBtn && welcomeOverlay) {
      entryBtn.addEventListener('click', () => {
        // 1. Desvanecer la pantalla de bienvenida
        welcomeOverlay.classList.add('welcome-overlay--hidden');

        // 2. Reproducir la música de fondo de inmediato
        if (this.bgMusic) {
          this.bgMusic.volume = 0.35;
          this.bgMusic.play().catch(err => console.log("Error al reproducir audio:", err));
        }

        // 3. Activar el AudioContext de los efectos de las páginas
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        // Activar la secuencia de letras de la primera página al entrar
        this.prepareTypewriterState();
        this.startSequentialTypewriter();
      });
    }
  }

  injectPageDecorations(faceElement) {
    const decorContainer = document.createElement('div');
    decorContainer.classList.add('page-decor-container');
    decorContainer.setAttribute('aria-hidden', 'true');

    decorContainer.innerHTML = `
      <div class="page-corner-ornament page-corner-ornament--tl"></div>
      <div class="page-corner-ornament page-corner-ornament--tr"></div>
      <div class="page-corner-ornament page-corner-ornament--bl"></div>
      <div class="page-corner-ornament page-corner-ornament--br"></div>
      
      <div class="page-floating-item page-floating-item--heart1">❤</div>
      <div class="page-floating-item page-floating-item--star1">✨</div>
      <div class="page-floating-item page-floating-item--heart2">❤</div>
      <div class="page-floating-item page-floating-item--star2">✦</div>
    `;
    faceElement.appendChild(decorContainer);
  }

  renderStaticLeftCover() {
    const leftPanel = document.createElement('div');
    leftPanel.classList.add('book__static-left-cover');
    leftPanel.innerHTML = `
      <div class="static-left-content">
        <h3 class="static-left-content__title js-typewriter" data-text="Con todo mi amor"></h3>
        <p class="static-left-content__text js-typewriter" data-text="Para la mujer que llena mis días de luz y alegría. Hoy celebramos tu vida... ✨"></p>
      </div>
    `;
    this.bookEl.appendChild(leftPanel);
  }

  renderPages() {
    const fragment = document.createDocumentFragment();

    this.pagesData.forEach((data, index) => {
      const page = document.createElement('div');
      page.classList.add('book__page');
      page.dataset.index = index;

      const front = document.createElement('div');
      front.classList.add('page-face', 'page-face--front');

      const back = document.createElement('div');
      back.classList.add('page-face', 'page-face--back');

      if (data.isCover) {
        front.classList.add('page-face--cover-front'); front.innerHTML = `
          <div class="cover-design">
            <h1 class="cover-design__title js-typewriter" data-text="${data.coverTitle}"></h1>
            <p class="cover-design__subtitle js-typewriter" data-text="${data.coverSubtitle}"></p>
          </div>
        `;
        back.innerHTML = `
          <div class="page-content__text-container">
            <p class="page-content__text js-typewriter" data-text="Este libro guarda un pedacito de todo lo que te amo. Pasa las páginas para recordar nuestra magia... ✨"></p>
          </div>
        `;
        this.injectPageDecorations(back);
      } else if (data.isLastPage) {
        front.innerHTML = `
          <div class="envelope-wrapper">
            <div class="envelope" id="finalEnvelope">
              <div class="envelope__flap"></div>
              <div class="envelope__letter">
                <h2 class="envelope__title js-envelope-type" data-text="${data.dedicationTitle}"></h2>
                <p class="envelope__message js-envelope-type" data-text="${data.dedicationText}"></p>
              </div>
              <div class="envelope__pocket"></div>
              <div class="envelope__seal"></div>
            </div>
          </div>
        `;
        back.innerHTML = `<div style="background:var(--cover-bg); height:100%; width:100%; border-radius:0 14px 14px 0; border: 3px solid var(--gold-primary);"></div>`;
        this.injectPageDecorations(front);
      } else {
        front.innerHTML = `
          <div class="photo-frame">
            <div class="photo-frame__corner photo-frame__corner--tl"></div>
            <div class="photo-frame__corner photo-frame__corner--tr"></div>
            <div class="photo-frame__corner photo-frame__corner--bl"></div>
            <div class="photo-frame__corner photo-frame__corner--br"></div>
            <img class="photo-frame__img" src="${data.frontImage}" alt="Recuerdo" loading="lazy">
          </div>
          <h2 class="page-content__caption js-typewriter" data-text="${data.caption}"></h2>
        `;
        back.innerHTML = `
          <div class="page-content__text-container">
            <p class="page-content__text js-typewriter" data-text="${data.backText}"></p>
          </div>
        `;
        this.injectPageDecorations(front);
        this.injectPageDecorations(back);
      }

      page.appendChild(front);
      page.appendChild(back);
      fragment.appendChild(page);
      this.pages.push(page);
    });

    this.bookEl.appendChild(fragment);
  }

  updateZIndexes() {
    this.pages.forEach((page, index) => {
      if (index < this.currentPage) {
        // Lado izquierdo (ya volteadas). Deben superar los covers estáticos que tienen z-index 5
        page.style.zIndex = 20 + index;
        page.style.pointerEvents = 'none';
      } else if (index === this.currentPage) {
        // Página activa actual en el lado derecho (al frente de todo)
        page.style.zIndex = 200;
        page.style.pointerEvents = 'auto';
      } else {
        // Páginas restantes en el lado derecho (apiladas ordenadamente hacia abajo)
        page.style.zIndex = 150 - index;
        page.style.pointerEvents = 'none';
      }
    });
    this.prevBtn.disabled = this.currentPage === 0;
    this.nextBtn.disabled = this.currentPage === this.pages.length;
  }

  bindEvents() {
    this.nextBtn.addEventListener('click', () => this.turnPage('forward'));
    this.prevBtn.addEventListener('click', () => this.turnPage('backward'));

    this.bookEl.addEventListener('click', async (e) => {
      const envelope = e.target.closest('.envelope');
      if (envelope) {
        const isOpening = !envelope.classList.contains('envelope--opened');
        envelope.classList.toggle('envelope--opened');
        this.playPaperSound(0.45);

        const titleEl = envelope.querySelector('.envelope__title');
        const msgEl = envelope.querySelector('.envelope__message');

        if (isOpening) {
          if (titleEl) await this.runTypewriter(titleEl, 55);
          if (msgEl) this.runTypewriter(msgEl, 40);
        } else {
          if (titleEl) titleEl.textContent = '';
          if (msgEl) msgEl.textContent = '';
          envelope.querySelectorAll('.js-envelope-type').forEach(el => el.classList.remove('js-typewriter--typing-complete'));
        }
      }
    });
  }

  runTypewriter(element, speed = 65) {
    return new Promise((resolve) => {
      if (this.typewriterIntervals.has(element)) {
        clearInterval(this.typewriterIntervals.get(element));
      }

      const targetText = element.getAttribute('data-text') || '';
      element.textContent = '';
      element.classList.remove('js-typewriter--typing-complete');

      if (!targetText) { resolve(); return; }

      let charIndex = 0;
      const interval = setInterval(() => {
        if (charIndex < targetText.length) {
          element.textContent += targetText.charAt(charIndex);
          charIndex++;
        } else {
          clearInterval(interval);
          element.classList.add('js-typewriter--typing-complete');
          this.typewriterIntervals.delete(element);
          resolve(); 
        }
      }, speed);

      this.typewriterIntervals.set(element, interval);
    });
  }

  prepareTypewriterState() {
    this.typewriterIntervals.forEach((interval) => clearInterval(interval));
    this.typewriterIntervals.clear();

    let leftElements = [];
    if (this.currentPage === 0) {
      const staticLeft = this.bookEl.querySelector('.book__static-left-cover');
      if (staticLeft) leftElements = staticLeft.querySelectorAll('.js-typewriter');
    } else {
      const prevPage = this.pages[this.currentPage - 1];
      if (prevPage) leftElements = prevPage.querySelectorAll('.page-face--back .js-typewriter');
    }

    let rightElements = [];
    if (this.currentPage < this.pages.length) {
      const currPage = this.pages[this.currentPage];
      if (currPage) rightElements = currPage.querySelectorAll('.page-face--front .js-typewriter');
    }

    this.bookEl.querySelectorAll('.js-typewriter').forEach(el => {
      const isActive = Array.from(leftElements).includes(el) || Array.from(rightElements).includes(el);
      if (!isActive) {
        el.textContent = el.getAttribute('data-text') || '';
        el.classList.add('js-typewriter--typing-complete');
      } else {
        el.textContent = ''; 
        el.classList.remove('js-typewriter--typing-complete');
      }
    });
  }

  async startSequentialTypewriter() {
    let leftElements = [];
    if (this.currentPage === 0) {
      const staticLeft = this.bookEl.querySelector('.book__static-left-cover');
      if (staticLeft) leftElements = staticLeft.querySelectorAll('.js-typewriter');
    } else {
      const prevPage = this.pages[this.currentPage - 1];
      if (prevPage) leftElements = prevPage.querySelectorAll('.page-face--back .js-typewriter');
    }

    let rightElements = [];
    if (this.currentPage < this.pages.length) {
      const currPage = this.pages[this.currentPage];
      if (currPage) rightElements = currPage.querySelectorAll('.page-face--front .js-typewriter');
    }

    for (const el of leftElements) {
      await this.runTypewriter(el, 65);
    }
    for (const el of rightElements) {
      await this.runTypewriter(el, 65);
    }
  }

  turnPage(direction) {
    if (this.isAnimating) return;

    let page;
    if (direction === 'forward') {
      if (this.currentPage >= this.pages.length) return;
      page = this.pages[this.currentPage];
      this.currentPage++;
    } else {
      if (this.currentPage <= 0) return;
      page = this.pages[this.currentPage - 1];
      this.currentPage--;
    }

    this.isAnimating = true;
    this.playPaperSound();

    this.prepareTypewriterState();

    page.classList.add('book__page--animated');
    page.style.zIndex = 500; 

    const targetRotation = direction === 'forward' ? -180 : 0;
    
    // Control definitivo de transiciones seguras
    let transitionSettled = false;

    const onTransitionEnd = (e) => {
      // Evitar que micro-animaciones internas de elementos hijos activen esto antes de tiempo
      if (e && e.target !== page) return;

      if (transitionSettled) return;
      transitionSettled = true;

      // Limpieza segura del listener
      page.removeEventListener('transitionend', onTransitionEnd);

      page.classList.remove('book__page--animated');
      this.isAnimating = false;
      this.updateZIndexes();
      
      this.startSequentialTypewriter();
    };

    // Registrar el listener ANTES de aplicar la transformación visual
    page.addEventListener('transitionend', onTransitionEnd);

    // Ejecutar la rotación en 3D
    page.style.transform = `rotateY(${targetRotation}deg)`;

    // MECANISMO DE RESPALDO ABSOLUTO (FALLBACK):
    // Si el navegador ignora el 'transitionend', forzamos el desbloqueo a los 900ms de forma segura
    setTimeout(() => {
      onTransitionEnd();
    }, 900);
  }

  async setupAudio() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const sampleRate = this.audioCtx.sampleRate;
      const duration = 0.24; 
      const length = sampleRate * duration;
      const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 16); 
        data[i] = (Math.random() * 2 - 1) * envelope * 0.35;
      }
      this.paperSoundBuffer = buffer;
    } catch (e) { console.warn('Audio contextual deshabilitado.'); }
  }

  playPaperSound(volume = 0.7) {
    if (!this.audioCtx || !this.paperSoundBuffer) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    const source = this.audioCtx.createBufferSource();
    source.buffer = this.paperSoundBuffer;
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 1200;
    const gainNode = this.audioCtx.createGain();
    gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    source.connect(filter); filter.connect(gainNode); gainNode.connect(this.audioCtx.destination);
    source.start();
  }
}