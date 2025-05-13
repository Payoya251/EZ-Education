// Sidebar toggle
document.addEventListener('DOMContentLoaded', function () {
    const toggleBtn = document.getElementById('toggle-btn');
    const sidebar = document.getElementById('sidebar');


    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });
    }


    // Contact form simulation
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        alert("Thanks for reaching out! We'll get back to you soon.");
        contactForm.reset();
      });
    }


    // Signup form simulation
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', function (e) {
        e.preventDefault();
        alert("Account created successfully!");
        signupForm.reset();
      });
    }


    // Login form simulation
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        alert("Login successful!");
        loginForm.reset();
      });
    }
  });
