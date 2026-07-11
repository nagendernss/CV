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

  // ---- scroll-driven 3D + parallax (damped lerp → smooth both ways) ----
  var showcase = document.getElementById("showcase");
  var heroBg = document.querySelector(".hero__bg");

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // progress 0..1 through the pinned showcase, recomputed every frame
  // (recompute + lerp is what makes scrolling UP reverse cleanly)
  function targetProgress() {
    if (!showcase) return 0;
    var rect = showcase.getBoundingClientRect();
    var scrollable = showcase.offsetHeight - window.innerHeight;
    return clamp(-rect.top / (scrollable || 1), 0, 1);
  }

  var curP = targetProgress();

  function render() {
    var tp = targetProgress();
    curP += (tp - curP) * 0.14;                       // damping
    if (Math.abs(tp - curP) < 0.0004) curP = tp;      // snap when settled
    if (showcase) showcase.style.setProperty("--p", curP.toFixed(4));

    var y = window.scrollY || window.pageYOffset || 0;
    if (heroBg && y < window.innerHeight) {
      heroBg.style.transform = "translateY(" + (y * 0.28).toFixed(1) + "px)";
    }
    requestAnimationFrame(render);
  }

  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", (window.scrollY || 0) > 20);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (!reduce) {
    requestAnimationFrame(render);
  } else if (showcase) {
    showcase.style.setProperty("--p", "0");
  }
})();
