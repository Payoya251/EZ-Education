document.addEventListener('DOMContentLoaded', function () {
  // Sidebar and toggle button functionality
  const toggleButton = document.getElementById('toggle-btn');
  const sidebar = document.getElementById('sidebar');
  const darkModeToggle = document.getElementById("darkModeToggle");
  const loginFormElement = document.getElementById('loginForm');

  if (toggleButton && sidebar) {
    toggleButton.addEventListener('click', () => {
      toggleButton.classList.toggle('open');
      sidebar.classList.toggle('show');
    });

    const sidebarLinks = sidebar.querySelectorAll('a');
    sidebarLinks.forEach(link => {
      link.addEventListener('click', () => {
        toggleButton.classList.remove('open');
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

  // Form handling
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      alert("Thanks for reaching out! We'll get back to you soon.");
      contactForm.reset();
    });
  }

  // Signup form handling
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      alert("Account created successfully!");
      signupForm.reset();
    });
  }

  // Login form handling
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      // Login logic will be handled by the form's action
    });
  }

  // Dark mode support
  const prefersDark = localStorage.getItem("darkMode") === "enabled";
  if (prefersDark) {
    document.body.classList.add("dark-mode");
  }

  if (darkModeToggle) {
    darkModeToggle.addEventListener("click", function () {
      document.body.classList.toggle("dark-mode");
      localStorage.setItem("darkMode", document.body.classList.contains("dark-mode") ? "enabled" : "disabled");
    });
  }
});
