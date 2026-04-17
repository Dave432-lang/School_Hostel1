/* auth.js — Login and Register page logic. Depends on api.js */

document.addEventListener('DOMContentLoaded', function () {

  // Auto-redirect to dashboard ONLY if we are on the login page (index.html)
  const isLoginPage = !window.location.pathname.includes('/pages/');
  if (isLoginPage && isLoggedIn()) {
    window.location.href = dashboardURL();
    return;
  }

  /* ---- Tab switching ---- */
  const tabBtns   = document.querySelectorAll('[data-tab]');
  const tabPanels = document.querySelectorAll('[data-panel]');

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      tabPanels.forEach(function (p) { p.classList.add('hidden'); });
      btn.classList.add('active');
      document.querySelector('[data-panel="' + btn.dataset.tab + '"]').classList.remove('hidden');
      hideAlert('login-alert');
      hideAlert('register-alert');
    });
  });

  /* ---- Password show/hide ---- */
  document.querySelectorAll('[data-toggle-password]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = document.getElementById(btn.dataset.togglePassword);
      if (!target) return;
      target.type = (target.type === 'text') ? 'password' : 'text';
      btn.textContent = (target.type === 'text') ? 'Hide' : 'Show';
    });
  });

  /* ---- LOGIN ---- */
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btn      = document.getElementById('login-btn');
      hideAlert('login-alert');
      btn.disabled    = true;
      btn.textContent = 'Signing in...';
      try {
        const data = await Auth.login(email, password);
        localStorage.setItem('user_id',    data.user_id);
        localStorage.setItem('user_name',  data.name || 'User');
        localStorage.setItem('user_email', data.email || email);
        localStorage.setItem('user_role',  data.role || 'student');
        localStorage.setItem('token',      data.token);
        window.location.href = dashboardURL();
      } catch (err) {
        showAlert('login-alert', err.message || 'Login failed. Check your credentials.');
      } finally {
        btn.disabled    = false;
        btn.textContent = 'Sign In';
      }
    });
  }

  /* ---- REGISTER ---- */
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const first_name = document.getElementById('reg-first-name').value.trim();
      const last_name  = document.getElementById('reg-last-name').value.trim();
      const student_id = document.getElementById('reg-student-id').value.trim();
      const programme  = document.getElementById('reg-programme').value.trim();
      const year_of_study = document.getElementById('reg-level').value;
      const email    = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirm  = document.getElementById('reg-confirm').value;
      const btn      = regForm.querySelector('[type="submit"]');
      hideAlert('register-alert');
      if (!year_of_study) { showAlert('register-alert', 'Please select a Year of Study.'); return; }
      if (password !== confirm) { showAlert('register-alert', 'Passwords do not match.'); return; }
      if (password.length < 6)  { showAlert('register-alert', 'Password must be at least 6 characters.'); return; }
      btn.disabled    = true;
      btn.textContent = 'Creating account...';
      try {
        const payload = { first_name, last_name, student_id, programme, year_of_study, email, password };
        const data = await Auth.register(payload);
        localStorage.setItem('user_id',    data.user_id);
        localStorage.setItem('user_name',  data.name || (first_name + ' ' + last_name));
        localStorage.setItem('user_email', data.email || email);
        localStorage.setItem('user_role',  data.role || 'student');
        localStorage.setItem('token',      data.token);
        window.location.href = dashboardURL();
      } catch (err) {
        showAlert('register-alert', err.message || 'Registration failed. Please try again.');
      } finally {
        btn.disabled    = false;
        btn.textContent = 'Create Account';
      }
    });
  }
});

function showAlert(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

function switchTab(tab) {
  const btn = document.querySelector('[data-tab="' + tab + '"]');
  if (btn) btn.click();
}