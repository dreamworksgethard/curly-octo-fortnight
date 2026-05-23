(function () {
  "use strict";

  // ─── Header scroll state ───
  const header = document.querySelector(".site-header");
  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ─── Mobile nav ───
  const toggle = document.querySelector(".nav-toggle");
  const navEnd = document.querySelector(".nav-end");
  if (toggle && navEnd) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      navEnd.classList.toggle("open", !open);
    });
    navEnd.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        navEnd.classList.remove("open");
      });
    });
  }

  // ─── Footer year ───
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ─── Scroll reveal ───
  const revealEls = document.querySelectorAll(
    ".glass-card, .section-head, .feature-card, .cap-list li, .tokenomics-head, .tokenomics-ca-block, .tokenomics-grid, .tokenomics-col--right, .terminal-panel, .hiw-flow-panel, .roadmap-panel, .about-intro, .about-preview, .about-pillars, .about-capabilities"
  );
  revealEls.forEach((el) => el.classList.add("reveal"));

  const revealObserver = new IntersectionObserver(
    (entries) => {
      const entering = entries.filter((e) => e.isIntersecting);
      const leaving = entries.filter((e) => !e.isIntersecting);

      leaving.forEach((entry) => {
        entry.target.classList.remove("visible");
        entry.target.style.transitionDelay = "";
      });

      entering.forEach((entry, i) => {
        entry.target.style.transitionDelay = `${i * 80}ms`;
        entry.target.classList.add("visible");
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  // ─── Counter animation ───
  const counters = document.querySelectorAll(".intel-value[data-count]");
  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || "";
        const duration = 1800;
        const start = performance.now();

        const tick = (now) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          const val = Math.floor(eased * target);
          el.textContent =
            suffix === "%"
              ? val + suffix
              : val.toLocaleString() + suffix;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        countObserver.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((c) => countObserver.observe(c));

  // ─── Copy contract address ───
  const copyCaBtn = document.getElementById("copy-ca-btn");
  const contractEl = document.getElementById("contract-address");
  const copyCaNote = document.getElementById("copy-ca-note");

  if (copyCaBtn && contractEl) {
    copyCaBtn.addEventListener("click", async () => {
      const address = (contractEl.dataset.ca || contractEl.textContent || "").trim();
      if (!address || address.startsWith("0x0000000000000000000000000000")) {
        if (copyCaNote) copyCaNote.textContent = "Contract address not set yet.";
        return;
      }
      try {
        await navigator.clipboard.writeText(address);
        copyCaBtn.classList.add("copied");
        copyCaBtn.textContent = "Copied";
        if (copyCaNote) copyCaNote.textContent = "Contract address copied to clipboard.";
        setTimeout(() => {
          copyCaBtn.classList.remove("copied");
          copyCaBtn.textContent = "Copy CA";
          if (copyCaNote) copyCaNote.textContent = "";
        }, 2200);
      } catch {
        if (copyCaNote) copyCaNote.textContent = "Copy failed. Select the address manually.";
      }
    });
  }
})();
