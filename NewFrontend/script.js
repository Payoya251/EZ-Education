document.addEventListener('DOMContentLoaded', function () {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      sidebar.classList.toggle('show');
    });

    const sidebarLinks = sidebar.querySelectorAll('a');
    sidebarLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        sidebar.classList.remove('show');
      });
    });
  }

  // Highlight active link in sidebar
  const currentPath = window.location.pathname.split("/").pop();
  document.querySelectorAll("nav.sidebar a").forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
    }
  });

  // Smooth scroll for anchor links
  const links = document.querySelectorAll("a[href^='#']");
  links.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Dark mode support (if used)
  const prefersDark = localStorage.getItem("darkMode") === "enabled";
  if (prefersDark) {
    document.body.classList.add("dark-mode");
  }

  const toggleDarkMode = document.getElementById("darkModeToggle");
  if (toggleDarkMode) {
    toggleDarkMode.addEventListener("click", function () {
      document.body.classList.toggle("dark-mode");
      localStorage.setItem("darkMode", document.body.classList.contains("dark-mode") ? "enabled" : "disabled");
    });
  }

  // Fake form submission handler
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      alert("Form submitted!");
      form.reset();
      form.classList.add("submitted");
      setTimeout(() => form.classList.remove("submitted"), 1000);
    });
  });
});
