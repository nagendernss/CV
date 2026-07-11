(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  // ---- scroll reveals ----
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal-up").forEach(function (el, i) {
    el.style.transitionDelay = (i % 4) * 0.07 + "s";
    io.observe(el);
  });

  // ---- nav: scrolled border + active tab ----
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

  // ---- scroll-driven 3D + parallax (rAF-throttled) ----
  var showcase = document.getElementById("showcase");
  var heroBg = document.querySelector(".hero__bg");
  var ticking = false;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function onFrame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;

    // hero background parallax (keeps blob drift animations intact)
    if (heroBg && y < window.innerHeight) {
      heroBg.style.transform = "translateY(" + (y * 0.28).toFixed(1) + "px)";
    }

    // showcase: device tucks under the desk as the pinned section scrolls
    if (showcase) {
      var rect = showcase.getBoundingClientRect();
      var scrollable = showcase.offsetHeight - window.innerHeight;
      var p = clamp(-rect.top / (scrollable || 1), 0, 1);
      showcase.style.setProperty("--p", p.toFixed(4));
    }
  }

  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", (window.scrollY || 0) > 20);
    if (reduce) return;
    if (!ticking) { ticking = true; requestAnimationFrame(onFrame); }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();
  if (!reduce) requestAnimationFrame(onFrame);
})();
