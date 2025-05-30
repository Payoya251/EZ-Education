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
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const errorElement = document.getElementById('login-error');
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.user && data.user.username) {
          // Store user data in localStorage
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('token', data.token || '');
          localStorage.setItem('username', data.user.username);
          
          // Use the redirect URL from server if provided, otherwise determine based on role
          if (data.redirect) {
            window.location.href = data.redirect;
          } else if (data.user.role === 'student') {
            window.location.href = '/student_dashboard.html';
          } else if (data.user.role === 'tutor') {
            window.location.href = '/tutor_dashboard.html';
          } else {
            // Default redirect if no role matches
            window.location.href = '/';
          }
        } else {
          // Show error message
          throw new Error(data.message || 'Incomplete user data received');
        }
      } catch (error) {
        console.error('Login error:', error);
        if (errorElement) {
          errorElement.textContent = 'An error occurred. Please try again.';
          errorElement.style.display = 'block';
        } else {
          alert('An error occurred. Please try again.');
        }
      }
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
