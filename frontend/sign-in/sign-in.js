const form = document.querySelector('#auth-form');
const notice = document.querySelector('#notice');
const nameField = document.querySelector('#name-field');
const nameInput = document.querySelector('#name');
const passwordInput = document.querySelector('#password');
const submitButton = document.querySelector('#auth-submit');
const modeButton = document.querySelector('#auth-mode');
const title = document.querySelector('#auth-title');
const description = document.querySelector('#auth-description');

let registerMode = false;

function renderMode() {
  nameField.hidden = !registerMode;
  nameInput.required = registerMode;
  passwordInput.autocomplete = registerMode ? 'new-password' : 'current-password';
  title.textContent = registerMode ? 'Create your account' : 'Welcome back';
  description.textContent = registerMode
    ? 'Create a standard participant account, then choose an eligible active contest.'
    : 'Sign in to join eligible contests and keep your answers saved as you go.';
  submitButton.textContent = registerMode ? 'Create account' : 'Sign in';
  modeButton.textContent = registerMode ? 'I already have an account' : 'Create an account';
}

function showNotice(message, tone = 'error') {
  notice.textContent = message;
  notice.className = `notice ${tone}`;
  notice.hidden = false;
}

async function authenticate(event) {
  event.preventDefault();
  const data = new FormData(form);
  const body = { email: data.get('email'), password: data.get('password') };
  if (registerMode) body.name = data.get('name');

  try {
    const response = await fetch(`/api/auth/${registerMode ? 'register' : 'login'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || 'Unable to sign in. Please try again.');
    sessionStorage.setItem('contestDemoToken', payload.token);
    sessionStorage.setItem('contestDemoUser', JSON.stringify(payload.user));
    window.location.assign('../');
  } catch (error) {
    showNotice(error.message);
  }
}

if (sessionStorage.getItem('contestDemoToken')) window.location.replace('../');
form.addEventListener('submit', authenticate);
modeButton.addEventListener('click', () => { registerMode = !registerMode; renderMode(); });
renderMode();
