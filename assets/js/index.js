  (function () {
    var hamburgerBtn = document.getElementById("hamburgerBtn");
    var navLinksEl = document.getElementById("navLinks");
    if (hamburgerBtn && navLinksEl) {
      hamburgerBtn.addEventListener("click", function () {
        navLinksEl.classList.toggle("open");
      });
      navLinksEl.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          navLinksEl.classList.remove("open");
        });
      });
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (e) {
        var target = document.querySelector(link.getAttribute("href"));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

    var progress = document.getElementById("scrollProgress");
    function updateProgress() {
      var scrollTop = window.scrollY;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (progress && docHeight > 0) {
        progress.style.width = (scrollTop / docHeight) * 100 + "%";
      }
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    var sections = document.querySelectorAll("section[id]");
    var navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    function updateActiveNav() {
      var scrollPos = window.scrollY + 120;
      sections.forEach(function (section) {
        if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
          navLinks.forEach(function (link) {
            link.classList.toggle("active", link.getAttribute("href") === "#" + section.id);
          });
        }
      });
    }
    window.addEventListener("scroll", updateActiveNav, { passive: true });
    updateActiveNav();

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var reveals = document.querySelectorAll(".reveal");
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      reveals.forEach(function (el) { observer.observe(el); });

      var blob1 = document.getElementById("blob1");
      var blob2 = document.getElementById("blob2");
      var blob3 = document.getElementById("blob3");
      window.addEventListener("mousemove", function (e) {
        var x = (e.clientX / window.innerWidth - 0.5) * 40;
        var y = (e.clientY / window.innerHeight - 0.5) * 40;
        if (blob1) blob1.style.transform = "translate(" + x + "px," + y + "px)";
        if (blob2) blob2.style.transform = "translate(" + (-x * 0.6) + "px," + (-y * 0.6) + "px)";
        if (blob3) blob3.style.transform = "translate(" + (x * 0.3) + "px," + (y * 0.3) + "px)";
      }, { passive: true });

      var heroPanel = document.getElementById("heroPanel");
      if (heroPanel) {
        heroPanel.addEventListener("mousemove", function (e) {
          var rect = heroPanel.getBoundingClientRect();
          var px = (e.clientX - rect.left) / rect.width - 0.5;
          var py = (e.clientY - rect.top) / rect.height - 0.5;
          heroPanel.style.transform = "perspective(900px) rotateY(" + (px * 8) + "deg) rotateX(" + (-py * 8) + "deg)";
        });
        heroPanel.addEventListener("mouseleave", function () {
          heroPanel.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
        });
      }

      document.querySelectorAll(".tilt-card").forEach(function (card) {
        card.addEventListener("mousemove", function (e) {
          var rect = card.getBoundingClientRect();
          var px = (e.clientX - rect.left) / rect.width - 0.5;
          var py = (e.clientY - rect.top) / rect.height - 0.5;
          card.style.transform = "perspective(800px) rotateY(" + (px * 6) + "deg) rotateX(" + (-py * 6) + "deg) translateY(-6px)";
        });
        card.addEventListener("mouseleave", function () {
          card.style.transform = "";
        });
      });
    } else {
      document.querySelectorAll(".reveal").forEach(function (el) {
        el.classList.add("visible");
      });
    }
  })();
