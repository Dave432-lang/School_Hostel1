/**
 * auth.js — Handles login and registration UI logic
 * Depends on: api.js
 */

document.addEventListener('DOMContentLoaded', () => {

  // If already logged in, skip straight to dashboard
  if (isLoggedIn()) {
    window.location.href = 'pages/dashboard.html';
    return;
  }

  /* ---- Tabs: Login / Register ---- */
  const tabBtns = document.querySelectorAll('[data-tab]');
  const tabPanels = document.querySelectorAll('[data-panel]');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.add('hidden'));
      btn.classList.add('active');
      document.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.remove('hidden');
      hideAlert('login-alert');
      hideAlert('register-alert');
    });
  });

  /* ---- Login Form ---- */
  const loginForm = document.getElementById('login-form');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = loginForm.querySelector('[type="submit"]');

    setLoading(btn, true);
    hideAlert('login-alert');

    try {
      const data = await Auth.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'pages/dashboard.html';
    } catch (err) {
      showAlert('login-alert', err.message || 'Login failed. Check your credentials.', 'error');
    } finally {
      setLoading(btn, false);
    }
  });

  /* ---- Register Form ---- */
  const registerForm = document.getElementById('register-form');
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;
    const btn      = registerForm.querySelector('[type="submit"]');

    if (password !== confirm) {
      showAlert('register-alert', 'Passwords do not match.', 'error');
      return;
    }

    setLoading(btn, true);
    hideAlert('register-alert');

    try {
      const data = await Auth.register({ name, email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'pages/dashboard.html';
    } catch (err) {
      showAlert('register-alert', err.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setLoading(btn, false);
    }
  });

  /* ---- Password toggle ---- */
  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.togglePassword);
      if (!target) return;
      const isText = target.type === 'text';
      target.type = isText ? 'password' : 'text';
      btn.textContent = isText ? '👁️' : '🙈';
    });
  });
});

/* ---- Helpers ---- */
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait...' : btn.dataset.defaultText || 'Submit';
}
