/* Scene engine: pinned fullscreen scenes, scroll-scrubbed step reveals.
   Smooth scroll via Lenis (same lib Shopify Editions uses); everything
   degrades to normal scrolling on small screens / reduced motion. */
(function () {
  "use strict";

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---- theme toggle (initial theme set in <head> to avoid flash) ----
  var toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var root = document.documentElement;
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  // ---- fallback: match the CSS unpin media conditions ----
  var fallback =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.innerWidth <= 760 || window.innerHeight <= 600;

  // ---- count-up formatting ----
  function fmt(el, v) {
    var s = el.dataset.group ? v.toLocaleString("en-US") : String(v);
    return (el.dataset.prefix || "") + s + (el.dataset.suffix || "");
  }

  // ---- collect scenes ----
  var scenes = [];
  document.querySelectorAll("[data-scene]").forEach(function (scene) {
    var entry = { el: scene, p: -1, counts: [], deck: null, dots: null };

    if (scene.hasAttribute("data-deck")) {
      // deck scene: cards swap in one at a time
      var cards = scene.querySelectorAll("[data-card]");
      var n = cards.length;
      var lead = 0.04, seg = (0.96 - lead) / n, fade = seg * 0.3;
      cards.forEach(function (card, i) {
        card.style.setProperty("--cs", (lead + i * seg).toFixed(4));
        card.style.setProperty("--ce", i === n - 1 ? "2" : (lead + (i + 1) * seg).toFixed(4));
        card.style.setProperty("--cfi", (1 / fade).toFixed(3));
      });
      entry.deck = { n: n, lead: lead, seg: seg };
      entry.dots = scene.querySelectorAll(".deck__dots i");
      scene.style.setProperty("--scenelen", 140 + n * 110);
    } else {
      // step scene: items reveal one by one
      var steps = scene.querySelectorAll(".step");
      var m = steps.length;
      var dur = parseFloat(scene.dataset.steplen) || 0.22;
      var slead = 0.07, tail = 0.9;
      var gap = m > 1 ? (tail - dur - slead) / (m - 1) : 0;
      steps.forEach(function (st, i) {
        var start = slead + i * gap;
        st.style.setProperty("--start", start.toFixed(4));
        // register count-ups living inside this step
        st.querySelectorAll(".count").forEach(function (c) {
          entry.counts.push({ el: c, target: parseFloat(c.dataset.target) || 0, start: start, inv: 1 / dur, last: "" });
        });
      });
      scene.style.setProperty("--inv", (1 / dur).toFixed(3));
      scene.style.setProperty("--scenelen", clamp(110 + m * 34, 170, 290));
    }
    scenes.push(entry);
  });

  // fallback: everything visible, counts at final value, no engine
  if (fallback) {
    document.querySelectorAll(".count").forEach(function (c) {
      c.textContent = fmt(c, parseFloat(c.dataset.target) || 0);
    });
  }

  // ---- smooth scroll (Lenis) ----
  var lenis = null;
  if (!fallback && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  }

  // ---- smooth anchor navigation ----
  document.querySelectorAll("[data-scrollto]").forEach(function (a) {
    a.addEventListener("click", function (ev) {
      var id = a.getAttribute("href");
      if (!id || id.charAt(0) !== "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      ev.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });

  // ---- nav: scrolled state + active tab ----
  var nav = document.getElementById("nav");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".nav__tabs a"));
  var tabFor = {};
  tabs.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    if (document.getElementById(id)) tabFor[id] = a;
  });
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting && tabFor[e.target.id]) {
        tabs.forEach(function (t) { t.classList.remove("active"); });
        tabFor[e.target.id].classList.add("active");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  Object.keys(tabFor).forEach(function (id) { spy.observe(document.getElementById(id)); });

  // ---- main loop ----
  var railFill = document.getElementById("railFill");
  var heroBg = document.querySelector(".hero__bg");
  var doc = document.documentElement;

  function frame(time) {
    if (lenis) lenis.raf(time);

    var y = window.scrollY || window.pageYOffset || 0;
    var vh = window.innerHeight;

    if (nav) nav.classList.toggle("scrolled", y > 20);

    if (railFill) {
      var total = doc.scrollHeight - vh;
      railFill.style.transform = "scaleY(" + (total > 0 ? y / total : 0).toFixed(4) + ")";
    }

    if (!fallback) {
      if (heroBg && y < vh) heroBg.style.transform = "translateY(" + (y * 0.28).toFixed(1) + "px)";

      for (var i = 0; i < scenes.length; i++) {
        var s = scenes[i];
        var rect = s.el.getBoundingClientRect();
        if (rect.bottom < -80 || rect.top > vh + 80) continue;   // offscreen
        // progress over the FULL travel (entry slide + pinned stretch) so the
        // first steps are already revealing while the scene slides into view —
        // no blank screen between scenes
        var total = s.el.offsetHeight;
        var p = clamp((vh - rect.top) / (total > 0 ? total : 1), 0, 1);
        if (Math.abs(p - s.p) > 0.0004) {
          s.p = p;
          s.el.style.setProperty("--p", p.toFixed(4));

          if (s.dots && s.deck) {
            var idx = clamp(Math.floor((p - s.deck.lead) / s.deck.seg), 0, s.deck.n - 1);
            for (var d = 0; d < s.dots.length; d++) s.dots[d].classList.toggle("on", d === idx);
          }

          for (var c = 0; c < s.counts.length; c++) {
            var cn = s.counts[c];
            var sp = clamp((p - cn.start) * cn.inv, 0, 1);
            var eased = 1 - Math.pow(1 - sp, 3);
            var txt = fmt(cn.el, Math.round(cn.target * eased));
            if (txt !== cn.last) { cn.last = txt; cn.el.textContent = txt; }
          }
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
