const state = {
  contests: [],
  selectedContest: null,
  participations: [],
  history: [],
  prizes: [],
  questions: [],
  activeView: null,
  activeAdminTask: 'create',
  token: sessionStorage.getItem('contestDemoToken') || '',
  user: JSON.parse(sessionStorage.getItem('contestDemoUser') || 'null'),
};

const elements = {
  adminPanel: document.querySelector('#admin-panel'),
  heroEyebrow: document.querySelector('#hero-eyebrow'),
  pageTitle: document.querySelector('#page-title'),
  heroDescription: document.querySelector('#hero-description'),
  catalogueEyebrow: document.querySelector('#catalogue-eyebrow'),
  catalogueTitle: document.querySelector('#catalogue-title'),
  contestList: document.querySelector('#contest-list'),
  contestDetail: document.querySelector('#contest-detail'),
  globalLeaderboard: document.querySelector('#global-leaderboard'),
  sessionControls: document.querySelector('#session-controls'),
  notice: document.querySelector('#notice'),
  contestForm: document.querySelector('#contest-form'),
  questionForm: document.querySelector('#question-form'),
  questionTarget: document.querySelector('#question-target'),
  totalContests: document.querySelector('#total-contests'),
  activeContests: document.querySelector('#active-contests'),
  vipContests: document.querySelector('#vip-contests'),
  searchForm: document.querySelector('#search-form'),
  searchSummary: document.querySelector('#search-summary'),
  participantPanel: document.querySelector('#participant-panel'),
  participationHistory: document.querySelector('#participation-history'),
  prizeList: document.querySelector('#prize-list'),
  generationForm: document.querySelector('#question-generation-form'),
  aiQuestionTarget: document.querySelector('#ai-question-target'),
  generateQuestionsButton: document.querySelector('#generate-questions'),
  generatedQuestionResults: document.querySelector('#generated-question-results'),
  editForm: document.querySelector('#contest-edit-form'),
  managementTarget: document.querySelector('#management-target'),
  adminContestSelect: document.querySelector('#admin-contest-select'),
  viewButtons: [...document.querySelectorAll('[data-view-target]')],
  adminTaskButtons: [...document.querySelectorAll('[data-admin-task-target]')],
  adminTaskPanels: [...document.querySelectorAll('[data-admin-task]')],
};

function authHeaders() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...authHeaders(), ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || 'Something went wrong. Please try again.');
  return payload;
}

function showNotice(message, tone = 'success') {
  elements.notice.textContent = message;
  elements.notice.className = `notice ${tone}`;
  elements.notice.hidden = false;
}

function clearNotice() {
  elements.notice.hidden = true;
  elements.notice.textContent = '';
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function statusClass(status) {
  return String(status || '').toLowerCase();
}

function statusBadge(status) {
  return `<span class="badge ${statusClass(status)}">${status}</span>`;
}

function accessBadge(level) {
  return `<span class="badge ${String(level).toLowerCase()}">${level}</span>`;
}

function renderSession() {
  const isAdmin = state.user?.role === 'ADMIN';
  const isParticipant = Boolean(state.user && !isAdmin);
  document.body.classList.toggle('admin-mode', isAdmin);
  renderViewCopy(isAdmin);
  document.querySelector('[data-view-target="admin"]').hidden = !isAdmin;
  document.querySelector('[data-view-target="account"]').hidden = !isParticipant;
  if (!state.activeView || (state.activeView === 'admin' && !isAdmin) || (state.activeView === 'account' && !isParticipant)) {
    state.activeView = isAdmin ? 'admin' : 'explore';
  }
  if (!state.user) {
    elements.sessionControls.innerHTML = '<span class="user-chip">Browsing as guest</span><a class="button primary" href="./sign-in/">Sign in</a>';
    renderAdminWorkspace();
    renderViews();
    return;
  }
  elements.sessionControls.innerHTML = `<span class="user-chip">${escapeHtml(state.user.name)} · ${state.user.role}</span><button id="sign-out" class="button secondary" type="button">Sign out</button>`;
  document.querySelector('#sign-out').addEventListener('click', signOut);
  renderAdminWorkspace();
  renderViews();
}

function renderViews() {
  document.querySelectorAll('[data-view]').forEach((section) => {
    section.hidden = section.dataset.view !== state.activeView;
  });
  elements.viewButtons.forEach((button) => {
    const active = button.dataset.viewTarget === state.activeView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

function switchView(view) {
  state.activeView = view;
  clearNotice();
  renderViews();
  document.querySelector('#primary-nav').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderViewCopy(isAdmin) {
  if (isAdmin) {
    elements.heroEyebrow.textContent = 'Contest operations';
    elements.pageTitle.textContent = 'Run a clear, reliable contest programme.';
    elements.heroDescription.textContent = 'Create contests, add questions, and monitor the public experience from one focused console.';
    elements.catalogueEyebrow.textContent = 'Contest management';
    elements.catalogueTitle.textContent = 'Published contests';
    return;
  }
  if (state.user) {
    elements.heroEyebrow.textContent = 'Your next challenge';
    elements.pageTitle.textContent = 'Choose a contest. Put your knowledge to work.';
    elements.heroDescription.textContent = 'Join an eligible active contest, save your progress, and submit when you are ready.';
    elements.catalogueEyebrow.textContent = 'Available to explore';
    elements.catalogueTitle.textContent = 'Find a contest';
    return;
  }
  elements.heroEyebrow.textContent = 'Timed knowledge challenges';
  elements.pageTitle.textContent = 'Find a contest. Make every answer count.';
  elements.heroDescription.textContent = 'Browse public contests, join when eligible, and save your progress as you go.';
  elements.catalogueEyebrow.textContent = 'Open catalogue';
  elements.catalogueTitle.textContent = 'Contests';
}

function renderAdminWorkspace() {
  const isAdmin = state.user?.role === 'ADMIN';
  if (!isAdmin) return;

  const contest = state.selectedContest;
  elements.questionForm.hidden = !contest;
  elements.generationForm.hidden = !contest;
  elements.editForm.hidden = !contest;
  elements.totalContests.textContent = state.contests.length;
  elements.activeContests.textContent = state.contests.filter((entry) => entry.status === 'ACTIVE').length;
  elements.vipContests.textContent = state.contests.filter((entry) => entry.accessLevel === 'VIP').length;
  elements.adminContestSelect.innerHTML = `<option value="">Select a contest</option>${state.contests.map((entry) => (
    `<option value="${entry.id}"${contest?.id === entry.id ? ' selected' : ''}>${escapeHtml(entry.name)} · ${entry.status}</option>`
  )).join('')}`;
  elements.questionTarget.textContent = contest ? `Adding to: ${contest.name}` : 'Select a contest first';
  elements.aiQuestionTarget.textContent = contest ? `Generating for: ${contest.name}` : 'Select a contest first';
  elements.managementTarget.textContent = contest ? contest.name : 'Select a contest first';
  if (contest) {
    document.querySelector('#question-topic').value = contest.topic;
    document.querySelector('#question-difficulty').value = contest.difficulty;
    populateContestEditForm(contest);
  } else {
    elements.generatedQuestionResults.innerHTML = '';
    if (state.activeAdminTask !== 'create') state.activeAdminTask = 'create';
  }
  renderAdminTasks();
}

function renderAdminTasks() {
  const hasContest = Boolean(state.selectedContest);
  elements.adminTaskButtons.forEach((button) => {
    const task = button.dataset.adminTaskTarget;
    const active = task === state.activeAdminTask;
    button.disabled = task !== 'create' && !hasContest;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  elements.adminTaskPanels.forEach((panel) => {
    panel.hidden = panel.dataset.adminTask !== state.activeAdminTask;
  });
}

function switchAdminTask(task) {
  if (task !== 'create' && !state.selectedContest) {
    showNotice('Select a contest before opening that admin task.', 'error');
    return;
  }
  state.activeAdminTask = task;
  clearNotice();
  renderAdminTasks();
}

function populateContestEditForm(contest) {
  const fields = elements.editForm.elements;
  fields.name.value = contest.name;
  fields.accessLevel.value = contest.accessLevel;
  fields.description.value = contest.description;
  fields.topic.value = contest.topic;
  fields.difficulty.value = contest.difficulty;
  fields.startTime.value = toDateTimeLocal(new Date(contest.startTime));
  fields.endTime.value = toDateTimeLocal(new Date(contest.endTime));
  fields.prizeDescription.value = contest.prizeDescription;
}

function renderContests() {
  if (!state.contests.length) {
    elements.contestList.innerHTML = '<p class="loading">No contests are available yet.</p>';
    return;
  }
  elements.contestList.innerHTML = state.contests.map((contest) => `
    <button class="contest-card ${state.selectedContest?.id === contest.id ? 'selected' : ''}" type="button" data-contest-id="${contest.id}">
      <div class="contest-card-top"><strong>${escapeHtml(contest.name)}</strong>${statusBadge(contest.status)}</div>
      <p>${escapeHtml(contest.topic)} · ${escapeHtml(contest.difficulty)}</p>
      <div class="meta-row">${accessBadge(contest.accessLevel)}<span class="muted">${formatDate(contest.startTime)}</span></div>
    </button>
  `).join('');
  elements.contestList.querySelectorAll('[data-contest-id]').forEach((button) => {
    button.addEventListener('click', () => selectContest(button.dataset.contestId));
  });
}

function currentParticipation() {
  return state.participations.find((participation) => participation.contest?.id === state.selectedContest?.id || participation.contestId === state.selectedContest?.id);
}

function canJoin(contest) {
  if (!state.user || contest.status !== 'ACTIVE' || state.user.role === 'ADMIN') return false;
  return contest.accessLevel === 'NORMAL' || state.user.role === 'VIP';
}

function renderDetail() {
  const contest = state.selectedContest;
  if (!contest) {
    elements.contestDetail.innerHTML = `
      <div class="empty-state">
        <p class="eyebrow">Select a contest</p>
        <h2>Your contest details will appear here.</h2>
        <p>Choose a contest to review its timing, access level, and prize.</p>
      </div>`;
    renderAdminWorkspace();
    return;
  }
  const participation = currentParticipation();
  const joinButton = canJoin(contest) && !participation
    ? '<button id="join-contest" class="button primary" type="button">Join contest</button>' : '';
  const continueButton = participation?.status === 'IN_PROGRESS' && contest.status === 'ACTIVE'
    ? '<button id="open-questions" class="button primary" type="button">Continue answering</button>' : '';
  const eligibility = !state.user
    ? '<span class="muted">Sign in to join an eligible active contest.</span>'
    : state.user.role === 'ADMIN'
      ? '<span class="muted">Admins can manage contests through the API but do not participate.</span>'
      : contest.accessLevel === 'VIP' && state.user.role !== 'VIP'
        ? '<span class="muted">This contest is available to VIP participants only.</span>'
        : '';
  elements.contestDetail.innerHTML = `
    <p class="eyebrow">${escapeHtml(contest.topic)} · ${escapeHtml(contest.difficulty)}</p>
    <h2 class="detail-title">${escapeHtml(contest.name)}</h2>
    <div class="detail-meta">${statusBadge(contest.status)}${accessBadge(contest.accessLevel)}<span>Starts ${formatDate(contest.startTime)}</span><span>Ends ${formatDate(contest.endTime)}</span></div>
    <p class="detail-description">${escapeHtml(contest.description)}</p>
    <p><strong>Prize:</strong> ${escapeHtml(contest.prizeDescription)}</p>
    <div class="detail-actions">${joinButton}${continueButton}<button id="view-contest-leaderboard" class="button secondary" type="button">View leaderboard</button></div>
    <p class="muted">${eligibility}</p>
    <div id="contest-workspace"></div>
  `;
  document.querySelector('#join-contest')?.addEventListener('click', joinContest);
  document.querySelector('#open-questions')?.addEventListener('click', loadQuestions);
  document.querySelector('#view-contest-leaderboard')?.addEventListener('click', loadContestLeaderboard);
  renderAdminWorkspace();
}

async function loadContests() {
  elements.contestList.innerHTML = '<p class="loading">Loading contests…</p>';
  try {
    const { contests } = await api('/api/contests');
    state.contests = contests;
    if (state.selectedContest) state.selectedContest = contests.find((contest) => contest.id === state.selectedContest.id) || null;
    renderContests();
    renderAdminWorkspace();
    if (state.selectedContest) renderDetail();
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

async function searchContests(event) {
  event.preventDefault();
  clearNotice();
  const query = new FormData(elements.searchForm).get('query').trim();
  try {
    const result = await api('/api/contests/search', { method: 'POST', body: JSON.stringify({ query }) });
    state.contests = result.contests;
    state.selectedContest = null;
    renderContests();
    renderDetail();
    renderAdminWorkspace();
    const filters = Object.entries(result.filters || {}).map(([key, value]) => `${key}: ${value}`);
    elements.searchSummary.textContent = filters.length
      ? `${result.contests.length} result(s) · Gemini understood ${filters.join(' · ')}`
      : `${result.contests.length} result(s) · No specific filters were inferred.`;
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

async function clearSearch() {
  elements.searchForm.reset();
  elements.searchSummary.textContent = '';
  state.selectedContest = null;
  await loadContests();
  renderDetail();
}

async function loadParticipations() {
  if (!state.token) {
    state.participations = [];
    return;
  }
  try {
    const { participations } = await api('/api/users/me/in-progress');
    state.participations = participations;
  } catch (error) {
    state.participations = [];
  }
}

async function loadAccountData() {
  if (!state.token || state.user?.role === 'ADMIN') {
    state.history = [];
    state.prizes = [];
    renderAccountData();
    return;
  }
  try {
    const [historyResult, prizesResult] = await Promise.all([
      api('/api/users/me/history'),
      api('/api/users/me/prizes'),
    ]);
    state.history = historyResult.participations;
    state.prizes = prizesResult.prizes;
    renderAccountData();
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

function renderAccountData() {
  elements.participationHistory.innerHTML = state.history.length
    ? state.history.map((entry) => `
      <article class="account-item">
        <div><strong>${escapeHtml(entry.contest.name)}</strong><span>${escapeHtml(entry.contest.topic)} · ${entry.status}</span></div>
        <span class="account-value">${entry.score === null ? 'In progress' : `${entry.score} points`}</span>
      </article>`).join('')
    : '<p class="loading">No contest participation yet.</p>';
  elements.prizeList.innerHTML = state.prizes.length
    ? state.prizes.map((prize) => `
      <article class="account-item">
        <div><strong>${escapeHtml(prize.contest.name)}</strong><span>${formatDate(prize.awardedAt)}</span></div>
        <span class="account-value">${escapeHtml(prize.prizeDescription)}</span>
      </article>`).join('')
    : '<p class="loading">No prizes awarded yet.</p>';
}

async function selectContest(id) {
  clearNotice();
  const listContest = state.contests.find((contest) => contest.id === id);
  if (!listContest) return;
  state.selectedContest = listContest;
  state.questions = [];
  renderContests();
  renderDetail();
  try {
    const { contest } = await api(`/api/contests/${id}`);
    state.selectedContest = contest;
    renderContests();
    renderDetail();
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

function toDateTimeLocal(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function setDefaultContestTimes() {
  const now = new Date();
  document.querySelector('#contest-start-time').value = toDateTimeLocal(new Date(now.getTime() + 5 * 60_000));
  document.querySelector('#contest-end-time').value = toDateTimeLocal(new Date(now.getTime() + 65 * 60_000));
}

async function createContest(event) {
  event.preventDefault();
  const form = new FormData(elements.contestForm);
  const startTime = new Date(form.get('startTime'));
  const endTime = new Date(form.get('endTime'));
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || startTime >= endTime) {
    showNotice('Choose an end time that is after the start time.', 'error');
    return;
  }
  const body = {
    name: form.get('name').trim(),
    description: form.get('description').trim(),
    accessLevel: form.get('accessLevel'),
    topic: form.get('topic').trim(),
    difficulty: form.get('difficulty').trim(),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    prizeDescription: form.get('prizeDescription').trim(),
  };
  try {
    const { contest } = await api('/api/contests', { method: 'POST', body: JSON.stringify(body) });
    elements.contestForm.reset();
    setDefaultContestTimes();
    await loadContests();
    await selectContest(contest.id);
    state.activeAdminTask = 'manual';
    renderAdminTasks();
    showNotice('Contest created. Add questions below before participants join.');
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

function contestBodyFromForm(formElement) {
  const form = new FormData(formElement);
  const startTime = new Date(form.get('startTime'));
  const endTime = new Date(form.get('endTime'));
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || startTime >= endTime) {
    throw new Error('Choose an end time that is after the start time.');
  }
  return {
    name: form.get('name').trim(),
    description: form.get('description').trim(),
    accessLevel: form.get('accessLevel'),
    topic: form.get('topic').trim(),
    difficulty: form.get('difficulty').trim(),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    prizeDescription: form.get('prizeDescription').trim(),
  };
}

async function updateContest(event) {
  event.preventDefault();
  if (!state.selectedContest) return;
  try {
    const body = contestBodyFromForm(elements.editForm);
    const { contest } = await api(`/api/contests/${state.selectedContest.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    state.selectedContest = contest;
    await loadContests();
    renderDetail();
    showNotice('Contest changes saved.');
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

async function deleteContest() {
  if (!state.selectedContest) return;
  const contestName = state.selectedContest.name;
  if (!window.confirm(`Delete “${contestName}”? This also removes its questions and participation data.`)) return;
  try {
    await api(`/api/contests/${state.selectedContest.id}`, { method: 'DELETE' });
    state.selectedContest = null;
    state.activeAdminTask = 'create';
    await loadContests();
    renderDetail();
    showNotice(`“${contestName}” was deleted.`);
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

async function finalizeContest() {
  if (!state.selectedContest) return;
  try {
    const { prize, alreadyFinalized } = await api(`/api/contests/${state.selectedContest.id}/finalize`, { method: 'POST' });
    showNotice(alreadyFinalized
      ? `Prize was already awarded to ${prize.user.name}.`
      : `Prize awarded to ${prize.user.name}: ${prize.prizeDescription}`);
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

function applyQuestionTypeDefaults() {
  const type = document.querySelector('#question-type').value;
  const options = document.querySelector('#question-options');
  const correctIndexes = document.querySelector('#correct-indexes');
  if (type === 'TRUE_FALSE') {
    options.value = 'True\nFalse';
    correctIndexes.value = '1';
    return;
  }
  if (!options.value) options.placeholder = 'Option one\nOption two\nOption three';
  if (!correctIndexes.value) correctIndexes.placeholder = type === 'MULTI_SELECT' ? '1, 3' : '1';
}

function parseQuestionOptions(form) {
  const optionTexts = form.get('optionsText').split('\n').map((option) => option.trim()).filter(Boolean);
  const positions = form.get('correctIndexes').split(',').map((item) => Number(item.trim()));
  const validPositions = positions.length > 0
    && positions.every((position) => Number.isInteger(position) && position >= 1 && position <= optionTexts.length)
    && new Set(positions).size === positions.length;
  if (optionTexts.length < 2 || optionTexts.length > 10 || !validPositions) {
    throw new Error('Provide 2-10 options and valid, unique 1-based correct option numbers.');
  }
  return { optionTexts, correctPositions: new Set(positions) };
}

async function createQuestion(event) {
  event.preventDefault();
  if (!state.selectedContest) return;
  const form = new FormData(elements.questionForm);
  const type = form.get('type');
  let parsed;
  try {
    parsed = parseQuestionOptions(form);
    if (type === 'SINGLE_SELECT' && parsed.correctPositions.size !== 1) throw new Error('Single-select questions need exactly one correct option.');
    if (type === 'TRUE_FALSE' && (parsed.optionTexts.length !== 2 || parsed.correctPositions.size !== 1
      || parsed.optionTexts.map((option) => option.toLowerCase()).sort().join(',') !== 'false,true')) {
      throw new Error('True/False questions need exactly True and False, with one correct option.');
    }
  } catch (error) {
    showNotice(error.message, 'error');
    return;
  }
  const body = {
    questionText: form.get('questionText').trim(),
    type,
    topic: form.get('topic').trim(),
    difficulty: form.get('difficulty').trim(),
    options: parsed.optionTexts.map((optionText, index) => ({ optionText, isCorrect: parsed.correctPositions.has(index + 1) })),
  };
  const explanation = form.get('explanation').trim();
  if (explanation) body.explanation = explanation;
  try {
    await api(`/api/contests/${state.selectedContest.id}/questions`, { method: 'POST', body: JSON.stringify(body) });
    elements.questionForm.reset();
    renderAdminWorkspace();
    applyQuestionTypeDefaults();
    showNotice('Question added to the selected contest.');
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

async function generateQuestions(event) {
  event.preventDefault();
  if (!state.selectedContest) return;
  const form = new FormData(elements.generationForm);
  const questionTypes = form.getAll('questionTypes');
  if (!questionTypes.length) {
    showNotice('Choose at least one question type.', 'error');
    return;
  }
  const body = { count: Number(form.get('count')), questionTypes };
  const topic = form.get('topic').trim();
  const difficulty = form.get('difficulty').trim();
  if (topic) body.topic = topic;
  if (difficulty) body.difficulty = difficulty;
  elements.generateQuestionsButton.disabled = true;
  elements.generateQuestionsButton.textContent = 'Generating…';
  try {
    const result = await api(`/api/contests/${state.selectedContest.id}/questions/generate`, {
      method: 'POST', body: JSON.stringify(body),
    });
    elements.generatedQuestionResults.innerHTML = `
      <p class="muted">Latest generated batch</p>
      ${result.questions.map((question) => `<article><strong>${escapeHtml(question.questionText)}</strong><span>${question.type.replaceAll('_', ' ')} · ${escapeHtml(question.difficulty)}</span></article>`).join('')}`;
    showNotice(`${result.generatedCount} question(s) generated${result.skippedDuplicates ? `; ${result.skippedDuplicates} duplicate(s) skipped` : ''}.`);
  } catch (error) {
    showNotice(error.message, 'error');
  } finally {
    elements.generateQuestionsButton.disabled = false;
    elements.generateQuestionsButton.textContent = 'Generate questions';
  }
}

async function joinContest() {
  try {
    const { participation } = await api(`/api/contests/${state.selectedContest.id}/join`, { method: 'POST' });
    state.participations.push({ ...participation, contest: state.selectedContest });
    showNotice('You joined the contest. Your answers can be saved individually.');
    renderDetail();
    await loadQuestions();
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

async function loadQuestions() {
  const workspace = document.querySelector('#contest-workspace');
  workspace.innerHTML = '<p class="loading">Loading questions…</p>';
  try {
    const { questions } = await api(`/api/contests/${state.selectedContest.id}/questions`);
    state.questions = questions;
    renderQuestions();
  } catch (error) {
    workspace.innerHTML = '';
    showNotice(error.message, 'error');
  }
}

function renderQuestions() {
  const workspace = document.querySelector('#contest-workspace');
  const participation = currentParticipation();
  if (!state.questions.length) {
    workspace.innerHTML = '<p class="muted">This contest has no questions yet.</p>';
    return;
  }
  workspace.innerHTML = `<section class="quiz"><h3>Questions</h3><p class="muted">Save each answer before the deadline. You can change a saved answer while the contest remains active.</p><div id="question-list"></div><div class="detail-actions"><button id="submit-contest" class="button primary" type="button">Submit contest</button></div></section>`;
  const list = document.querySelector('#question-list');
  const template = document.querySelector('#question-template');
  state.questions.forEach((question, index) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.question-card');
    card.dataset.questionId = question.id;
    fragment.querySelector('legend').textContent = `${index + 1}. ${question.questionText}`;
    const inputType = question.type === 'MULTI_SELECT' ? 'checkbox' : 'radio';
    const inputsName = `question-${question.id}`;
    fragment.querySelector('.option-list').innerHTML = question.options.map((option) => `
      <label class="option"><input type="${inputType}" name="${inputsName}" value="${option.id}">${escapeHtml(option.optionText)}</label>
    `).join('');
    fragment.querySelector('.save-answer').addEventListener('click', () => saveAnswer(question.id, participation.id));
    list.append(fragment);
  });
  document.querySelector('#submit-contest').addEventListener('click', () => submitContest(participation.id));
}

async function saveAnswer(questionId, participationId) {
  const card = document.querySelector(`[data-question-id="${questionId}"]`);
  const selectedOptionIds = [...card.querySelectorAll('input:checked')].map((input) => input.value);
  if (!selectedOptionIds.length) {
    showNotice('Select at least one option before saving.', 'error');
    return;
  }
  try {
    await api(`/api/participations/${participationId}/answers/${questionId}`, {
      method: 'PUT', body: JSON.stringify({ selectedOptionIds }),
    });
    showNotice('Answer saved. You can update it until the contest ends.');
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

async function submitContest(participationId) {
  if (!window.confirm('Submit your contest? Saved answers cannot be changed after submission.')) return;
  try {
    const { participation } = await api(`/api/participations/${participationId}/submit`, { method: 'POST' });
    state.participations = state.participations.filter((entry) => entry.id !== participation.id);
    document.querySelector('#contest-workspace').innerHTML = `<p class="submission-summary">Contest submitted. Your score is ${participation.score}.</p>`;
    showNotice('Your contest was submitted successfully.');
    await loadGlobalLeaderboard();
    await loadAccountData();
    renderDetail();
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

function renderLeaderboard(target, entries, global = false) {
  if (!entries.length) {
    target.innerHTML = '<p class="loading">No submitted results yet.</p>';
    return;
  }
  target.innerHTML = entries.map((entry) => {
    const user = entry.user || {};
    const score = global ? `${entry.totalScore} total points` : `${entry.score} points`;
    return `<div class="leaderboard-row"><span class="rank">${entry.rank}</span><strong>${escapeHtml(user.name || 'Participant')}</strong><span class="leaderboard-score">${score}</span></div>`;
  }).join('');
}

async function loadGlobalLeaderboard() {
  elements.globalLeaderboard.innerHTML = '<p class="loading">Loading leaderboard…</p>';
  try {
    const { leaderboard } = await api('/api/leaderboard');
    renderLeaderboard(elements.globalLeaderboard, leaderboard, true);
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

async function loadContestLeaderboard() {
  const workspace = document.querySelector('#contest-workspace');
  workspace.innerHTML = '<p class="loading">Loading contest leaderboard…</p>';
  try {
    const { leaderboard } = await api(`/api/contests/${state.selectedContest.id}/leaderboard`);
    workspace.innerHTML = '<section class="quiz"><h3>Contest leaderboard</h3><div id="contest-leaderboard" class="leaderboard-list"></div></section>';
    renderLeaderboard(document.querySelector('#contest-leaderboard'), leaderboard);
  } catch (error) {
    workspace.innerHTML = '';
    showNotice(error.message, 'error');
  }
}

function signOut() {
  state.token = '';
  state.user = null;
  state.participations = [];
  state.history = [];
  state.prizes = [];
  state.questions = [];
  state.activeView = 'explore';
  state.activeAdminTask = 'create';
  sessionStorage.removeItem('contestDemoToken');
  sessionStorage.removeItem('contestDemoUser');
  showNotice('You have been signed out.');
  renderSession();
  renderDetail();
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

elements.contestForm.addEventListener('submit', createContest);
elements.questionForm.addEventListener('submit', createQuestion);
elements.generationForm.addEventListener('submit', generateQuestions);
elements.editForm.addEventListener('submit', updateContest);
document.querySelector('#delete-contest').addEventListener('click', deleteContest);
document.querySelector('#finalize-contest').addEventListener('click', finalizeContest);
elements.searchForm.addEventListener('submit', searchContests);
document.querySelector('#clear-search').addEventListener('click', clearSearch);
document.querySelector('#refresh-account').addEventListener('click', loadAccountData);
document.querySelector('#question-type').addEventListener('change', applyQuestionTypeDefaults);
document.querySelector('#refresh-contests').addEventListener('click', loadContests);
document.querySelector('#refresh-leaderboard').addEventListener('click', loadGlobalLeaderboard);
elements.viewButtons.forEach((button) => button.addEventListener('click', () => switchView(button.dataset.viewTarget)));
elements.adminTaskButtons.forEach((button) => button.addEventListener('click', () => switchAdminTask(button.dataset.adminTaskTarget)));
elements.adminContestSelect.addEventListener('change', async () => {
  if (!elements.adminContestSelect.value) {
    state.selectedContest = null;
    state.activeAdminTask = 'create';
    renderContests();
    renderDetail();
    return;
  }
  await selectContest(elements.adminContestSelect.value);
  state.activeAdminTask = 'manage';
  renderAdminTasks();
});

renderSession();
setDefaultContestTimes();
applyQuestionTypeDefaults();
Promise.all([loadContests(), loadGlobalLeaderboard(), loadParticipations(), loadAccountData()]).then(() => state.selectedContest && renderDetail());
