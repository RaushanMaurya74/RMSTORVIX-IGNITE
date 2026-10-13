// RMSTORVIX IGNITE — Client-Side Auth Logic
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Verifying credentials...';

      const email = loginForm.email.value;
      const password = loginForm.password.value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        window.location.href = data.redirect || '/dashboard';
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = 'Sign in to RMSTORVIX IGNITE';
      }
    });
  }

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = signupForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Registering business...';

      const formData = new FormData(signupForm);
      const payload = Object.fromEntries(formData.entries());

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        window.location.href = data.redirect || '/pending';
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = 'Submit Business for Verification';
      }
    });
  }

  const forgotForm = document.getElementById('forgotForm');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = forgotForm.email.value;
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.resetLink) {
        alert(`${data.message}\n\nReset Link:\n${window.location.origin}${data.resetLink}`);
        window.location.href = data.resetLink;
      } else {
        alert(data.message);
      }
    });
  }

  const resetForm = document.getElementById('resetForm');
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = resetForm.token.value;
      const new_password = resetForm.new_password.value;
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password })
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Failed to reset password');
      alert(data.message);
      window.location.href = '/login';
    });
  }
});
