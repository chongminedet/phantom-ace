/* ============================================================
   PH_ANTOM ACE — main.js
   GSAP + ScrollTrigger + SplitText · Lenis · GLightbox · Typed.js
   ============================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------
     0. CONFIG — social URLs live in js/socials.js (single source of
        truth shared with links.html). Paste them there; anything left
        empty here stays hidden rather than faking a destination.
        Sanity settings fetched later can still override at runtime.
     ------------------------------------------------------------ */
  var SOCIALS = Object.assign(
    { instagram: '', tiktok: '', youtube: '' },
    window.PHANTOM_SOCIALS || {}
  );

  var PHONE = '+2349079339677';
  var EMAIL = 'hello@phantomace.com';

  /* Sanity CMS — paste the real projectId from sanity.io/manage to pull
     projects + site settings live. Empty (or placeholder) means the
     fetch is skipped entirely and the hardcoded DOM stays authoritative.
     A pre-set window.__SANITY_CFG = { projectId, dataset } overrides both
     (used by tests / an inline config script). */
  var SANITY = {
    projectId: (window.__SANITY_CFG && window.__SANITY_CFG.projectId) || 's90y64hf',
    dataset:  (window.__SANITY_CFG && window.__SANITY_CFG.dataset) || 'production',
    api:      'v2024-01-01'
  };

  /* ------------------------------------------------------------ */
  var doc  = document;
  var html = doc.documentElement;
  var $  = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!window.gsap;
  /* Set true once the webfonts are usable. When false we skip SplitText so
     line masks are never cut against fallback-font metrics. */
  var fontsUsable = false;

  var loader   = $('#loader');
  var barTop   = $('.fx--bar-top');
  var barBot   = $('.fx--bar-bot');
  var toastEl  = $('#toast');

  function killLoader() {
    if (loader) { loader.style.display = 'none'; loader.setAttribute('aria-hidden', 'true'); }
    html.classList.add('is-loaded');
    if (barTop) barTop.style.height = '';
    if (barBot) barBot.style.height = '';
  }

  /* ---------- No-GSAP / catastrophic failure guard ---------- */
  function bail(reason) {
    html.classList.add('no-anim');
    killLoader();
    try {
      if (window.ScrollTrigger && ScrollTrigger.getAll) {
        ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
      }
      if (window.gsap) {
        var casualties = $$('[data-reveal],[data-split],.reveal,.split-line,.reveal,' +
          '.hero__line-in,.hero__eyebrow,.hero__roles,.hero__cta .btn,.hero__hud li,' +
          '.hero__scroll,.hero__frame .c,.nav,.stat__n,.eyebrow__rule,.reel-card');
        casualties.forEach(function (el) { gsap.set(el, { clearProps: 'all' }); });
        gsap.set('.loader,.fx--bar-top,.fx--bar-bot', { clearProps: 'all' });
      }
    } catch (e) {}
    if (window.console && reason) console.warn('[portfolio] animation disabled:', reason);
  }
  window.addEventListener('error', function (e) {
    if (!hasGsap) return;
    if (e && e.target && e.target.tagName === 'SCRIPT') bail('script failed to load');
  }, true);

  if (!hasGsap) { bail('gsap missing'); return; }

  gsap.registerPlugin(window.ScrollTrigger);
  if (window.ScrollToPlugin)  gsap.registerPlugin(window.ScrollToPlugin);
  if (window.Observer)        gsap.registerPlugin(window.Observer);
  gsap.ticker.lagSmoothing(0);

  var ScrollTrigger = window.ScrollTrigger;

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3800);
  }

  /* ------------------------------------------------------------
     1. SMOOTH SCROLL — Lenis wired into ScrollTrigger
     ------------------------------------------------------------ */
  var lenis = null;
  try {
    if (window.Lenis && !reduced) {
      lenis = new window.Lenis({
        duration: 1.15,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true,
        touchMultiplier: 1.6
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
      html.classList.add('has-lenis');
    }
  } catch (err) { lenis = null; }

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: -88, duration: 1.25 });
    else if (window.ScrollToPlugin) gsap.to(window, { scrollTo: { y: target, offsetY: 88 }, duration: 1.1, ease: 'power3.inOut' });
    else target.scrollIntoView({ behavior: 'smooth' });
  }

  /* ------------------------------------------------------------
     1b. DEEP LINKS — arriving with #work (links.html → index.html#work)
         must land *after* the preloader lifts and ScrollTrigger has
         laid out the pinned reel. The browser guesses a position while
         the page is still hidden and moving, so we re-aim once things
         settle — but never fight a visitor who has already scrolled.
     ------------------------------------------------------------ */
  var hashTouched = false;
  function markHashTouched() { hashTouched = true; }
  ['wheel', 'touchmove', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, markHashTouched, { passive: true });
  });

  function syncHash() {
    if (hashTouched) return;
    var h = window.location.hash;
    if (!h || h === '#') return;
    var target = null;
    try { target = doc.querySelector(h); } catch (e) { return; }
    if (!target) return;
    requestAnimationFrame(function () { scrollToTarget(target); });
  }

  /* ------------------------------------------------------------
     2. CURSOR
     ------------------------------------------------------------ */
  (function cursor() {
    var el = $('#cursor');
    if (!el || reduced) return;
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

    var dot = $('.cursor__dot', el);
    var ring = $('.cursor__ring', el);
    var label = $('#cursorLabel');
    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;

    el.classList.add('is-live');
    doc.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    doc.addEventListener('mousedown', function () { el.classList.add('is-down'); });
    doc.addEventListener('mouseup',   function () { el.classList.remove('is-down'); });

    gsap.ticker.add(function () {
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
    });

    doc.addEventListener('mouseover', function (e) {
      var t = e.target.closest ? e.target.closest('[data-cursor],a,button,input,textarea,select') : null;
      el.classList.remove('is-play', 'is-view');
      if (!t) return;
      var mode = t.getAttribute && t.getAttribute('data-cursor');
      if (mode === 'play') { el.classList.add('is-play'); if (label) label.textContent = 'Play'; return; }
      if (mode === 'view') { el.classList.add('is-view'); if (label) label.textContent = 'Open'; return; }
      if (t.matches('a,button,input,textarea,select')) { el.classList.add('is-view'); if (label) label.textContent = ''; }
    });
  })();

  /* ------------------------------------------------------------
     3. HUD — timecode, scroll progress, section label, nav state
     ------------------------------------------------------------ */
  (function hud() {
    var tcEl = $('#timecode');
    var prog = $('#progressBar');
    var hudSection = $('#hudSection');
    var nav = $('#nav');
    var links = $$('.nav__link');
    var sections = $$('[data-section]');
    var t0 = performance.now();
    var lastY = window.scrollY;

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function clock(now) {
      var s = (now - t0) / 1000;
      var f = Math.floor((s % 1) * 24);
      tcEl.textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' +
                         pad(Math.floor(s) % 60) + ':' + pad(f);
      requestAnimationFrame(clock);
    }
    if (tcEl) requestAnimationFrame(clock);

    var queued = false;
    function update() {
      queued = false;
      var y = window.scrollY;
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      if (prog) prog.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';

      if (nav) {
        nav.classList.toggle('is-solid', y > 40);
        if (y > 220 && y > lastY + 4) nav.classList.add('is-hidden');
        else if (y < lastY - 4 || y < 220) nav.classList.remove('is-hidden');
      }
      lastY = y;

      var mid = y + window.innerHeight * 0.42;
      var current = null;
      for (var i = 0; i < sections.length; i++) {
        var s = sections[i];
        if (s.offsetTop <= mid) current = s;
      }
      if (current) {
        var navId = current.getAttribute('data-nav');
        if (hudSection) hudSection.textContent = current.getAttribute('data-section') || '';
        links.forEach(function (l) {
          l.classList.toggle('is-active', !!navId && l.getAttribute('href') === navId);
        });
      }
    }
    function onScroll() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    if (lenis) lenis.on('scroll', onScroll);
    update();
  })();

  /* ------------------------------------------------------------
     4. NAV — links, burger
     ------------------------------------------------------------ */
  (function nav() {
    var burger = $('#navBurger');
    var sheet = $('#navSheet');

    $$('[data-scroll]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) !== '#') return;
        var target = doc.querySelector(href);
        if (!target) return;
        e.preventDefault();
        closeSheet();
        markHashTouched();
        scrollToTarget(target);
        try { history.replaceState(null, '', href); } catch (err) {}
      });
    });

    function closeSheet() {
      if (!sheet) return;
      sheet.classList.remove('is-open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
      if (lenis) lenis.start();
    }
    if (burger && sheet) {
      burger.addEventListener('click', function () {
        var open = sheet.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (lenis) { open ? lenis.stop() : lenis.start(); }
      });
    }
  })();

  /* ------------------------------------------------------------
     5. SOCIAL LINKS — a configured URL becomes a real external link;
        an empty one stays hidden so the icon never claims to be a
        shortcut to a profile it cannot reach. The link-hub icon is
        always present and always honest.
        Called again after a successful Sanity settings fetch.
     ------------------------------------------------------------ */
  function applySocials() {
    var any = false;
    $$('[data-social]').forEach(function (a) {
      var url = SOCIALS[a.getAttribute('data-social')];
      if (url) {
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.hidden = false;
        any = true;
      } else {
        a.removeAttribute('href');
        a.hidden = true;
      }
    });
    var note = $('.contact__note');
    if (note) {
      note.textContent = any
        ? 'Socials open directly — everything else is in the link hub.'
        : 'Socials coming soon — everything else is in the link hub.';
    }
  }
  applySocials();

  /* ------------------------------------------------------------
     6. PRELOADER — film leader countdown
     The inline leader in index.html starts first and owns the count
     until main.js claims it. If main.js never runs, the inline leader
     still dismisses the preloader, so the page is never permanently
     hidden behind it.
     ------------------------------------------------------------ */
  var started = false;

  function startSite() {
    if (started) return;
    started = true;
    html.classList.add('is-loaded');

    var barH = 20;
    if (barTop) {
      var prev = barTop.style.height;
      barTop.style.height = '';
      barH = barTop.getBoundingClientRect().height || 20;
      barTop.style.height = prev || '50vh';
    }

    var tl = gsap.timeline();
    tl.to('.loader__bars i', { scaleY: 0, duration: 0.9, stagger: 0.07, ease: 'expo.inOut' }, 0)
      .to('.loader__core', { opacity: 0, scale: 0.94, duration: 0.5, ease: 'power2.in' }, 0.1)
      .to('.loader__foot', { opacity: 0, duration: 0.4 }, 0.1)
      .set(loader, { display: 'none' })
      .add(revealHero, '-=0.15');

    if (barTop && barBot && barH) {
      tl.fromTo([barTop, barBot], { height: '50vh' },
        { height: barH, duration: 1.15, ease: 'expo.inOut', clearProps: 'height' }, 0.15);
    }
  }

  var heroRevealed = false;
  function revealHero() {
    if (heroRevealed) return;
    heroRevealed = true;
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__line-in', { yPercent: 112, duration: 1.35, stagger: 0.1 }, 0)
      .from('.hero__eyebrow', { y: 26, opacity: 0, duration: 0.9 }, 0.15)
      .from('.hero__roles', { y: 20, opacity: 0, duration: 0.9 }, 0.5)
      .from('.hero__cta .btn', { y: 30, opacity: 0, duration: 0.9, stagger: 0.1 }, 0.62)
      .from('.hero__hud li', { x: 34, opacity: 0, duration: 0.8, stagger: 0.07 }, 0.7)
      .from('.hero__scroll', { opacity: 0, y: 18, duration: 0.8 }, 0.9)
      .from('.hero__frame .c', { scale: 0.3, opacity: 0, duration: 0.9, stagger: 0.06 }, 0.55)
      .from('.nav', { yPercent: -130, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, 0.35);

    if (ScrollTrigger) ScrollTrigger.refresh();
  }

  function runLoader() {
    if (!loader) { revealHero(); return; }
    if (reduced) { killLoader(); return; }

    /* The inline leader already finished - it owns the dismissal and the
       page content is already on screen. Still play the hero entrance,
       but only if that just happened; if main.js booted late the hero has
       been sitting visible for a while and re-hiding it would flash. */
    if (window.__loaderInline && window.__loaderInline.done) {
      var since = (window.__loaderInline.at || 0) ? performance.now() - window.__loaderInline.at : 0;
      if (since >= 0 && since < 1500) revealHero();
      return;
    }
    if (loader.style.display === 'none') { revealHero(); return; }
    if (window.__loaderInline) window.__loaderInline.owner = 'gsap';

    gsap.set([barTop, barBot], { height: '50vh' });

    var num = $('#loaderNum');
    var ring = $('#loaderRing');
    var CIRC = 578;
    var startV = num ? (parseInt(num.textContent, 10) || 0) : 0;
    if (!isFinite(startV) || startV < 0) startV = 0;
    var state = { v: startV };

    gsap.to(state, {
      v: 100,
      duration: Math.max(0.5, 1.9 * (1 - startV / 100)),
      ease: 'power2.inOut',
      onUpdate: function () {
        var v = Math.round(state.v);
        if (num) num.textContent = v < 10 ? '0' + v : '' + v;
        if (ring) ring.style.strokeDashoffset = CIRC - (CIRC * v) / 100;
      },
      onComplete: startSite
    });

    setTimeout(function () {
      if (loader && loader.style.display !== 'none') { gsap.killTweensOf(state); startSite(); }
    }, 4200);
  }

  /* ------------------------------------------------------------
     7. HERO — crossfading footage + typed roles
     ------------------------------------------------------------ */
  (function hero() {
    var vids = $$('[data-hero]');
    if (vids.length && !reduced) {
      vids[0].play().catch(function () {});
      var i = 0;
      setInterval(function () {
        var prev = vids[i];
        i = (i + 1) % vids.length;
        var next = vids[i];
        try {
          prev.classList.remove('is-on');
          next.classList.add('is-on');
          next.currentTime = 0;
          next.play().catch(function () {});
          setTimeout(function () { prev.pause(); }, 1700);
        } catch (e) {}
      }, 6500);
    } else if (vids.length) {
      /* prefers-reduced-motion: hold on the first poster, no crossfade */
      vids.forEach(function (v) { try { v.pause(); v.currentTime = 0; } catch (e) {} });
    }

    if (window.Typed && $('#typedRoles')) {
      if (reduced) {
        $('#typedRoles').textContent = 'Cinematographer & Video Editor';
      } else {
        new window.Typed('#typedRoles', {
          strings: [
            'Cinematographer',
            'Video Editor',
            'Colour Grading',
            'Drone Operator',
            'Content Creator'
          ],
          typeSpeed: 58, backSpeed: 30, backDelay: 1500,
          loop: true, showCursor: true, cursorChar: '_'
        });
      }
    }
  })();

  /* ------------------------------------------------------------
     8. TEXT SPLITS + SCROLL REVEALS
     ------------------------------------------------------------ */
  function splitReveal(el) {
    var opts = { trigger: el, start: 'top 88%' };
    if (fontsUsable && window.SplitText) {
      try {
        var split = new SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
        if (split.lines && split.lines.length) {
          gsap.from(split.lines, {
            yPercent: 115, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.085,
            scrollTrigger: opts
          });
          return;
        }
      } catch (e) { /* fall through */ }
    }
    gsap.from(el, { y: 46, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: opts });
  }

  function initReveals() {
    /* reduced motion: never run the from-tweens - they hide content first,
       which would leave sections invisible while we refuse to animate. */
    if (reduced) return;

    $$('[data-split]').forEach(function (el) {
      if (el.closest('.hero')) return;
      splitReveal(el);
    });

    $$('[data-reveal]').forEach(function (el, i) {
      gsap.from(el, {
        y: 44, opacity: 0, duration: 1, ease: 'expo.out',
        delay: (i % 4) * 0.05,
        scrollTrigger: { trigger: el, start: 'top 90%' }
      });
    });

    $$('.reveal').forEach(function (el) {
      gsap.from(el, {
        y: 34, opacity: 0, duration: 0.95, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%' }
      });
    });

    /* counters — HTML keeps the real value so it survives a JS failure */
    $$('[data-count]').forEach(function (el) {
      var to = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: function () {
          var obj = { v: 0 };
          el.textContent = '0' + suffix;
          gsap.to(obj, {
            v: to, duration: 1.8, ease: 'power2.out',
            onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; }
          });
        }
      });
    });

    /* parallax layers */
    $$('[data-parallax]').forEach(function (el) {
      var amt = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      gsap.to(el, {
        yPercent: -amt * 100, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* section titles — subtle scale-in on the rules */
    $$('.eyebrow__rule').forEach(function (el) {
      gsap.from(el, {
        scaleX: 0, transformOrigin: 'left center', duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 95%' }
      });
    });
  }

  /* ------------------------------------------------------------
     9. REEL — pinned horizontal scroll (desktop) / swipe (mobile)
     ------------------------------------------------------------ */
  function initReel() {
    var section = $('#work');
    var track = $('#reelTrack');
    if (!section || !track) return;
    section.classList.add('is-pinned');

    var mm = gsap.matchMedia();

    /* Pinned horizontal scroll — desktop AND phones held in portrait, so
       vertical scrolling moves the reel exactly the same everywhere. */
    function pin(scrub) {
      section.classList.add('is-pinned');
      var distance = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.to(track, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: function () { return '+=' + distance(); },
          pin: true,
          scrub: scrub,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });
      return function () {
        if (tween.scrollTrigger) tween.scrollTrigger.kill();
        tween.kill();
        gsap.set(track, { clearProps: 'x' });
      };
    }

    /* Landscape phones are too short to pin the cards without clipping them
       — fall back to native horizontal swipe there (and if JS/GSAP never
       runs, the CSS overflow + scroll-snap does the same everywhere). */
    function swipe() {
      section.classList.remove('is-pinned');
      gsap.set(track, { clearProps: 'x' });
      return function () { section.classList.add('is-pinned'); };
    }

    mm.add('(min-width: 901px)', function () { return pin(1); });
    mm.add('(max-width: 900px) and (orientation:portrait)', function () { return pin(0.6); });
    mm.add('(max-width: 900px) and (orientation:landscape)', swipe);
  }

  /* ------------------------------------------------------------
     10. REEL CARD — hover preview playback.
         Optional root scopes binding to freshly cloned cards only,
         so existing frames are never double-bound.
     ------------------------------------------------------------ */
  function initCardHover(root) {
    $$('.reel-card__frame', root).forEach(function (frame) {
      var vid = $('.reel-card__vid', frame);
      if (!vid) return;
      var loaded = false;

      frame.addEventListener('mouseenter', function () {
        if (!loaded && vid.dataset.src) {
          vid.src = vid.dataset.src;
          loaded = true;
        }
        frame.classList.add('is-playing');
        try { vid.currentTime = 0; } catch (e) {}
        vid.play().catch(function () {});
      });
      frame.addEventListener('mouseleave', function () {
        frame.classList.remove('is-playing');
        try { vid.pause(); } catch (e) {}
      });
      frame.addEventListener('touchstart', function () {}, { passive: true });
    });
  }

  /* ------------------------------------------------------------
     11. LIGHTBOX — GLightbox for full-film playback
     ------------------------------------------------------------ */
  function initLightbox() {
    if (!window.GLightbox) return null;
    try {
      var lb = window.GLightbox({
        selector: '.gclick',
        loop: false,
        touchNavigation: true,
        keyboardNavigation: true,
        openEffect: 'fade',
        closeEffect: 'fade'
      });
      if (lb && lb.on) {
        lb.on('open', function () { if (lenis) lenis.stop(); });
        lb.on('close', function () { if (lenis) lenis.start(); });
      }
      return lb;
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------------
     12. CONTACT FORM — hands the brief to WhatsApp
     ------------------------------------------------------------ */
  (function form() {
    var f = $('#contactForm');
    if (!f) return;
    var fName = $('#fName'), fEmail = $('#fEmail'), fMsg = $('#fMsg');
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function mark(el, bad) {
      if (!el) return;
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      el.classList.toggle('is-invalid', !!bad);
    }

    [fName, fEmail, fMsg].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', function () {
        if (el.getAttribute('aria-invalid') !== 'true') return;
        var v = el.value.trim();
        mark(el, !v || (el === fEmail && !EMAIL_RE.test(v)));
      });
    });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (fName && fName.value.trim()) || '';
      var email = (fEmail && fEmail.value.trim()) || '';
      var type = $('#fType') ? $('#fType').value : '';
      var msg = (fMsg && fMsg.value.trim()) || '';

      var missing = !name || !email || !msg;
      var emailBad = !missing && !EMAIL_RE.test(email);

      mark(fName, !name);
      mark(fEmail, !email || !EMAIL_RE.test(email));
      mark(fMsg, !msg);

      if (missing || emailBad) {
        toast(missing ? 'Please fill in name, email and brief.' : 'That email address looks off.');
        var first = !name ? fName : (!email || !EMAIL_RE.test(email) ? fEmail : fMsg);
        if (first) { try { first.focus({ preventScroll: false }); } catch (err) { try { first.focus(); } catch (e2) {} }
          if (lenis) { try { lenis.scrollTo(first, { offset: -140, duration: .8 }); } catch (e3) {} } }
        return;
      }

      var text = 'New project brief — Ph_antom ACE portfolio\n\n'
        + 'Name: ' + name + '\n'
        + 'Email: ' + email + '\n'
        + 'Type: ' + type + '\n\n'
        + msg;

      window.open('https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      toast('Opening WhatsApp — your brief is ready to send.');
      [fName, fEmail, fMsg].forEach(function (el) { if (el) mark(el, false); });
      f.reset();
    });
  })();

  /* ------------------------------------------------------------
     13. SANITY CMS — live projects + settings from the Content Lake.
         Kicked off after boot, never blocks. Any failure (no project
         id, offline, CORS, timeout, bad payload) leaves the hardcoded
         DOM untouched — that is the offline fallback.
     ------------------------------------------------------------ */
  var lightbox = null;
  var revealsDone = false;

  function applyEmail() {
    $$('a[href^="mailto:"]').forEach(function (a) {
      a.setAttribute('href', 'mailto:' + EMAIL);
      var v = $('.contact__v', a);
      if (v) v.textContent = EMAIL;
      else if (!a.firstElementChild) a.textContent = EMAIL;
    });
  }

  function applyPhone() {
    $$('a[href^="tel:"]').forEach(function (a) {
      a.setAttribute('href', 'tel:' + PHONE);
      var v = $('.contact__v', a);
      if (v) v.textContent = PHONE;
      else if (!a.firstElementChild) a.textContent = PHONE;
    });
  }

  function fillCard(card, p, i, total) {
    var frame = card.querySelector('.reel-card__frame');
    var img   = card.querySelector('.reel-card__img');
    var vid   = card.querySelector('.reel-card__vid');
    var tag   = card.querySelector('.reel-card__tag');
    var idx   = card.querySelector('.reel-card__idx');
    var h3    = card.querySelector('.reel-card__body h3');
    var desc  = card.querySelector('.reel-card__body p');
    var meta  = card.querySelector('.reel-card__meta');
    var pad   = function (n) { return (n < 10 ? '0' : '') + n; };

    if (frame) {
      frame.setAttribute('href', p.video);
      frame.setAttribute('aria-label', 'Play ' + p.title);
    }
    if (img) {
      img.setAttribute('src', p.poster);
      img.setAttribute('alt', p.title + ' poster');
    }
    if (vid) {
      if (p.hoverVideo) {
        vid.setAttribute('data-src', p.hoverVideo);
        if (vid.hasAttribute('src')) {
          vid.removeAttribute('src');
          try { vid.load(); } catch (e) {}
        }
      } else {
        vid.removeAttribute('data-src');
        if (vid.hasAttribute('src')) {
          vid.removeAttribute('src');
          try { vid.load(); } catch (e) {}
        }
      }
    }
    if (tag && p.category) tag.textContent = p.category;
    if (idx) idx.textContent = pad(i + 1) + ' / ' + pad(total);
    if (h3)  h3.textContent = p.title;
    if (desc) desc.textContent = p.description || '';
    if (meta) {
      meta.textContent = '';
      var chips = (p.tags && p.tags.length) ? p.tags : (p.category ? [p.category] : []);
      chips.slice(0, 4).forEach(function (t) {
        var li = doc.createElement('li');
        li.textContent = t;
        meta.appendChild(li);
      });
    }
  }

  function hydrateCards(items) {
    var track = $('#reelTrack');
    if (!track || !items.length) return false;
    var existing = $$('.reel-card', track);
    if (!existing.length) return false;

    var end = $('.reel__end', track);
    var total = items.length;
    var changed = false;
    var fresh = [];

    items.forEach(function (p, i) {
      var card;
      if (i < existing.length) {
        card = existing[i];
      } else {
        card = existing[0].cloneNode(true);
        if (end) track.insertBefore(card, end);
        else track.appendChild(card);
        fresh.push(card);
        changed = true;
      }
      fillCard(card, p, i, total);
    });

    /* fewer projects in Sanity than cards on screen → drop the surplus */
    for (var j = total; j < existing.length; j++) {
      var dead = existing[j];
      if (hasGsap) {
        try {
          gsap.getTweensOf(dead).forEach(function (t) {
            if (t.scrollTrigger) t.scrollTrigger.kill();
            t.kill();
          });
        } catch (e) {}
      }
      if (dead.parentNode) dead.parentNode.removeChild(dead);
      changed = true;
    }

    if (!changed) return false;

    fresh.forEach(function (card) {
      /* cloned cards were never seen by initReveals — mirror its reveal,
         unless it will run later and pick them up itself */
      if (revealsDone && !reduced && hasGsap) {
        gsap.from(card, {
          y: 44, opacity: 0, duration: 1, ease: 'expo.out',
          scrollTrigger: { trigger: card, start: 'top 90%' }
        });
      }
      initCardHover(card);
    });

    /* DOM changed → GLightbox must re-scan, reel distances re-measure */
    if (lightbox && typeof lightbox.destroy === 'function') {
      try { lightbox.destroy(); } catch (e) {}
      lightbox = initLightbox();
    }
    if (window.ScrollTrigger) {
      try { ScrollTrigger.refresh(); } catch (e) {}
    }
    return true;
  }

  function applySettings(s) {
    if (!s) return;
    var emailChanged = false;
    var phoneChanged = false;
    var socialsChanged = false;

    if (s.email && s.email !== EMAIL) { EMAIL = s.email; emailChanged = true; }
    if (s.phone) {
      var tel = String(s.phone).replace(/[^\d+]/g, '');
      if (tel && tel !== PHONE) { PHONE = tel; phoneChanged = true; }
    }
    ['instagram', 'tiktok', 'youtube'].forEach(function (k) {
      if (s[k] && s[k] !== SOCIALS[k]) { SOCIALS[k] = s[k]; socialsChanged = true; }
    });

    if (socialsChanged) applySocials();
    if (emailChanged) applyEmail();
    if (phoneChanged) applyPhone();
  }

  function hydrateFromSanity() {
    try {
      if (typeof fetch !== 'function') return;
      var pid = SANITY.projectId;
      if (!pid || /^your_/i.test(pid)) return;

      var q = '{"projects":*[_type=="project"]' +
        '|order(coalesce(order,100) asc, _createdAt asc)' +
        '{title, category, description, video,' +
        ' "poster": poster.asset->url,' +
        ' "hoverVideo": hoverVideo.asset->url, tags},' +
        ' "settings":*[_type=="siteSettings"][0]' +
        '{email, phone, instagram, tiktok, youtube}}';

      var url = 'https://' + pid + '.apicdn.sanity.io/' + SANITY.api +
        '/data/query/' + encodeURIComponent(SANITY.dataset) +
        '?query=' + encodeURIComponent(q);

      var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      var done = false;
      var timer = setTimeout(function () {
        if (!done && ctrl) { try { ctrl.abort(); } catch (e) {} }
      }, 4000);
      function finish() { done = true; clearTimeout(timer); }

      fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
        .then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.json();
        })
        .then(function (data) {
          finish();
          try {
            var res = (data && data.result) || {};
            var items = (res.projects || []).filter(function (p) {
              return p && p.title && p.video && p.poster;
            });
            if (items.length) hydrateCards(items);
            if (res.settings) applySettings(res.settings);
          } catch (e) {}
        })
        .catch(function (e) {
          finish();
          if (window.console && console.info) {
            console.info('[portfolio] sanity unavailable, using offline fallback —', e && e.message);
          }
        });
    } catch (e) {}
  }

  /* ------------------------------------------------------------
     14. BOOT
     ------------------------------------------------------------ */
  /* Safety net: if any reveal is somehow stuck hidden while on screen, free it. */
  function revealSafetyNet() {
    setTimeout(function () {
      try {
        $$('[data-reveal],[data-split],.reveal').forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.8 && r.bottom > 0 &&
              parseFloat(window.getComputedStyle(el).opacity) < 0.05) {
            gsap.getTweensOf(el).forEach(function (t) {
              if (t.scrollTrigger) t.scrollTrigger.kill();
              t.kill();
            });
            gsap.set(el, { clearProps: 'opacity,transform,filter' });
          }
        });
        $$('[data-count]').forEach(function (el) {
          if (el.textContent.replace(/[^0-9]/g, '') === '0') {
            el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || '');
          }
        });
        ScrollTrigger.refresh();
      } catch (e) {}
    }, 4500);
  }

  /* Webfonts load async now, so wait for them before splitting text —
     but never forever. After ~8s we give up and reveal without SplitText,
     which is metric-independent and therefore safe with fallback fonts. */
  function whenFontsReady(cb) {
    var fired = false;
    function go(usable) {
      if (fired) return;
      fired = true;
      fontsUsable = usable;
      cb();
    }
    if (!doc.fonts || !doc.fonts.check) { go(true); return; }

    var hard = setTimeout(function () { go(false); }, 8000);
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var ok = false;
      try { ok = !!window.__fontsCss && doc.fonts.check('1em "Bebas Neue"'); } catch (e) { ok = true; }
      if (ok) { clearInterval(iv); clearTimeout(hard); go(true); }
      else if (tries > 52) { clearInterval(iv); clearTimeout(hard); go(false); }
    }, 150);
  }

  function boot() {
    try {
      initReel();
      initCardHover();
      lightbox = initLightbox();
      runLoader();
      revealSafetyNet();
      hydrateFromSanity();

      whenFontsReady(function () {
        try {
          initReveals();
          revealsDone = true;
          if (ScrollTrigger) ScrollTrigger.refresh();
          syncHash();
        } catch (e) {
          bail(e && e.message ? e.message : e);
        }
      });

      syncHash();

      if (ScrollTrigger) {
        window.addEventListener('load', function () {
          ScrollTrigger.refresh();
          syncHash();
        });
      }
    } catch (err) {
      bail(err && err.message ? err.message : err);
    }
  }

  if (doc.readyState === 'complete' || doc.readyState === 'interactive') boot();
  else doc.addEventListener('DOMContentLoaded', boot);

})();
