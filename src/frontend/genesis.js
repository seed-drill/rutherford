/**
 * Rutherford Genesis - Conversational Onboarding for Cordelia
 *
 * This module handles the frontend conversational flow for creating
 * a new Cordelia user profile. Rutherford guides users through
 * identity, preferences, and working style questions.
 */

const API_BASE = '';
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('send-btn');
const progressEl = document.getElementById('progress');
const headerUser = document.getElementById('header-user');
const countdownEl = document.getElementById('countdown');
const countdownTimeEl = document.getElementById('countdown-time');

// Auth state from session
let authData = null;

// Conversation state
let currentStep = 0;
let userData = {
  name: '',
  github_id: '',
  roles: [],
  org_name: '',
  org_role: '',
  style: [],
  key_refs: [],
  heroes: [],
  planning_mode: 'important',
  verbosity: 'concise',
  emoji: false,
};

// Question countdown timer (seconds)
const QUESTION_TIMEOUT = 60;
let countdownInterval = null;
let countdownRemaining = 0;

// Rutherford's conversation flow with Genesis references
const steps = [
  {
    id: 'pre_check',
    message: "Well, well! A new face. I'm Rutherford. Before we begin, I need to ask - do you already have a local Cordelia profile you'd like to upload?",
    type: 'select',
    options: [
      { value: 'genesis', label: "No - let's start fresh (Genesis mode)" },
      { value: 'upload', label: 'Yes - I want to upload my local profile' },
      { value: 'bare', label: 'Skip questions - create bare account' },
    ],
    field: 'setup_mode',
    noCountdown: true,
  },
  {
    id: 'intro',
    message: "Excellent choice! Every great journey needs a proper beginning - and this is yours.",
    delay: 1200,
    autoAdvance: true,
  },
  {
    id: 'intro2',
    message: "I'll be asking you some questions so Cordelia can remember who you are across all your sessions. Think of it as laying down the first tracks of your memory album.",
    delay: 1500,
    autoAdvance: true,
  },
  {
    id: 'name',
    message: "Let's start at the very beginning - a very good place to start. What's your name?",
    field: 'name',
    validate: (v) => v.trim().length > 0,
    countdown: QUESTION_TIMEOUT,
  },
  {
    id: 'github_confirm',
    message: (data) => `Pleasure to meet you, ${data.name}! I see you've signed in as @${data.github_id}. That's how we'll recognise you when you return.`,
    autoAdvance: true,
    delay: 1500,
  },
  {
    id: 'org',
    message: "Now then, tell me about your world. What organisation do you work with? If you're a solo act, just say 'independent'.",
    field: 'org_name',
    countdown: QUESTION_TIMEOUT,
  },
  {
    id: 'role',
    message: (data) => data.org_name.toLowerCase() === 'independent'
      ? "A solo artist! Respect. What do you do? What's your craft?"
      : `${data.org_name}, interesting! What's your role there?`,
    field: 'org_role',
    countdown: QUESTION_TIMEOUT,
  },
  {
    id: 'roles',
    message: "What other roles do you play? Founder, engineer, designer, writer... we all wear multiple hats. Add as many as apply.",
    field: 'roles',
    type: 'tags',
    placeholder: 'Add a role and press Enter...',
    countdown: QUESTION_TIMEOUT,
  },
  {
    id: 'style_intro',
    message: "Right, now for the interesting part. I want to understand how you think - your invisible touch, if you will.",
    autoAdvance: true,
    delay: 1500,
  },
  {
    id: 'style',
    message: "How would you describe your working style? Pick any that resonate:",
    type: 'multiselect',
    options: [
      'first_principles', 'iterative', 'systems_thinking', 'visual',
      'analytical', 'creative', 'pragmatic', 'detail_oriented', 'big_picture'
    ],
    field: 'style',
    countdown: QUESTION_TIMEOUT,
  },
  {
    id: 'planning',
    message: "When facing a land of confusion - er, I mean a complex task - how much planning do you prefer?",
    type: 'select',
    options: [
      { value: 'critical', label: 'Critical - always plan first' },
      { value: 'important', label: 'Important - plan for significant work' },
      { value: 'optional', label: 'Optional - dive in, plan if needed' },
    ],
    field: 'planning_mode',
    countdown: QUESTION_TIMEOUT,
  },
  {
    id: 'verbosity',
    message: "How verbose should Cordelia be in responses? Some like it short, others want the full prog-rock epic.",
    type: 'select',
    options: [
      { value: 'minimal', label: 'Minimal - just the essentials' },
      { value: 'concise', label: 'Concise - brief but complete' },
      { value: 'detailed', label: 'Detailed - the full concept album' },
    ],
    field: 'verbosity',
    countdown: QUESTION_TIMEOUT,
  },
  {
    id: 'refs_intro',
    message: "Now for the deep cuts. I'd like to know about the books and ideas that shaped your thinking. These are your key references - the influences that matter.",
    autoAdvance: true,
    delay: 2000,
  },
  {
    id: 'key_refs',
    message: "What books or works have been formative for you? Format them as author:title (e.g., 'hofstadter:godel_escher_bach'). Skip if you'd rather not say.",
    field: 'key_refs',
    type: 'tags',
    placeholder: 'author:title',
    optional: true,
    countdown: QUESTION_TIMEOUT,
  },
  {
    id: 'heroes',
    message: "Who are your heroes? The giants whose shoulders you stand on. Scientists, artists, engineers, anyone whose work inspires you.",
    field: 'heroes',
    type: 'tags',
    placeholder: 'Add a name...',
    optional: true,
    countdown: QUESTION_TIMEOUT,
  },
  {
    id: 'emoji',
    message: "Last question - this is crucial - how do you feel about emoji?",
    type: 'select',
    options: [
      { value: false, label: 'No thanks - keep it professional' },
      { value: true, label: 'Yes please - bring the expression!' },
    ],
    field: 'emoji',
    countdown: QUESTION_TIMEOUT,
  },
  {
    id: 'summary',
    message: (data) => `Excellent! Here's what I've learned about you:

**${data.name}** (@${data.github_id})
${data.org_name.toLowerCase() !== 'independent' ? `${data.org_role} at ${data.org_name}` : data.org_role}
${data.roles.length ? `Roles: ${data.roles.join(', ')}` : ''}
${data.style.length ? `Style: ${data.style.map(s => s.replace(/_/g, ' ')).join(', ')}` : ''}
Planning: ${data.planning_mode} | Verbosity: ${data.verbosity}
${data.key_refs.length ? `Key refs: ${data.key_refs.join(', ')}` : ''}
${data.heroes.length ? `Heroes: ${data.heroes.join(', ')}` : ''}
Emoji: ${data.emoji ? 'Yes' : 'No'}

Does this look right? Ready to turn it on again?`,
    type: 'select',
    options: [
      { value: 'yes', label: "Yes - let's go!" },
      { value: 'no', label: 'Start over' },
    ],
    field: 'confirm',
  },
];

function addMessage(text, type = 'rutherford', html = false) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  if (html) {
    div.innerHTML = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  } else {
    div.textContent = text;
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function addOptions(options, multiselect = false) {
  const container = document.createElement('div');
  container.className = 'options-container';

  const selected = new Set();

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = typeof opt === 'string' ? opt.replace(/_/g, ' ') : opt.label;
    btn.dataset.value = typeof opt === 'string' ? opt : String(opt.value);

    btn.onclick = () => {
      if (multiselect) {
        if (selected.has(btn.dataset.value)) {
          selected.delete(btn.dataset.value);
          btn.classList.remove('selected');
        } else {
          selected.add(btn.dataset.value);
          btn.classList.add('selected');
        }
      } else {
        // Convert 'true'/'false' strings back to booleans if needed
        let value = btn.dataset.value;
        if (value === 'true') value = true;
        if (value === 'false') value = false;
        handleInput(value);
        container.remove();
      }
    };
    container.appendChild(btn);
  });

  if (multiselect) {
    const doneBtn = document.createElement('button');
    doneBtn.className = 'send-btn';
    doneBtn.style.marginTop = '0.5rem';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = () => {
      handleInput(Array.from(selected));
      container.remove();
    };
    container.appendChild(document.createElement('br'));
    container.appendChild(doneBtn);
  }

  messagesEl.appendChild(container);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addTagInput(field, placeholder, optional = false) {
  const container = document.createElement('div');
  container.className = 'multi-input';

  const tags = [];
  const tagDisplay = document.createElement('div');
  tagDisplay.className = 'tag-display';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;

  const addTag = (value) => {
    if (value && !tags.includes(value)) {
      tags.push(value);
      const tag = document.createElement('span');
      tag.className = 'tag-item';
      tag.innerHTML = `${value} <span class="tag-remove" data-value="${value}">×</span>`;
      tag.querySelector('.tag-remove').onclick = () => {
        const idx = tags.indexOf(value);
        if (idx > -1) tags.splice(idx, 1);
        tag.remove();
      };
      tagDisplay.appendChild(tag);
      input.value = '';
    }
  };

  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input.value.trim());
    }
  };

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '0.5rem';

  const doneBtn = document.createElement('button');
  doneBtn.className = 'send-btn';
  doneBtn.textContent = tags.length || !optional ? 'Done' : 'Skip';
  doneBtn.onclick = () => {
    if (input.value.trim()) addTag(input.value.trim());
    handleInput(tags);
    container.remove();
  };

  btnRow.appendChild(doneBtn);

  container.appendChild(tagDisplay);
  container.appendChild(input);
  container.appendChild(btnRow);
  messagesEl.appendChild(container);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  input.focus();
}

function updateProgress() {
  const pct = (currentStep / (steps.length - 1)) * 100;
  progressEl.style.width = `${pct}%`;
}

function startCountdown(seconds) {
  stopCountdown();
  countdownRemaining = seconds;
  countdownEl.style.display = 'flex';
  countdownEl.className = 'countdown-display';
  updateCountdownDisplay();

  countdownInterval = setInterval(() => {
    countdownRemaining--;
    updateCountdownDisplay();

    if (countdownRemaining <= 0) {
      stopCountdown();
      // Auto-skip when countdown expires
      handleTimeout();
    }
  }, 1000);
}

function updateCountdownDisplay() {
  countdownTimeEl.textContent = countdownRemaining;
  if (countdownRemaining <= 10) {
    countdownEl.className = 'countdown-display critical';
  } else if (countdownRemaining <= 20) {
    countdownEl.className = 'countdown-display warning';
  }
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  countdownEl.style.display = 'none';
}

function handleTimeout() {
  const step = steps[currentStep];
  // Use default or skip
  if (step.optional) {
    handleInput([]);
  } else if (step.type === 'select' && step.options.length > 0) {
    const defaultOpt = step.options[0];
    handleInput(typeof defaultOpt === 'string' ? defaultOpt : defaultOpt.value);
  } else if (step.type === 'multiselect') {
    handleInput([]);
  } else if (step.type === 'tags') {
    handleInput([]);
  } else {
    // For text input, use placeholder or skip
    handleInput('(skipped)');
  }
}

async function showStep(step) {
  updateProgress();

  // Show typing indicator
  const typing = addMessage('Rutherford is typing...', 'typing');

  await new Promise(r => setTimeout(r, step.delay || 800));
  typing.remove();

  // Get message text
  const msgText = typeof step.message === 'function' ? step.message(userData) : step.message;
  addMessage(msgText, 'rutherford', true);

  if (step.autoAdvance) {
    await new Promise(r => setTimeout(r, step.delay || 1000));
    currentStep++;
    if (currentStep < steps.length) {
      showStep(steps[currentStep]);
    }
    return;
  }

  // Start countdown if specified
  if (step.countdown && !step.noCountdown) {
    startCountdown(step.countdown);
  }

  // Show appropriate input type
  if (step.type === 'select') {
    addOptions(step.options, false);
    inputEl.disabled = true;
    sendBtn.disabled = true;
  } else if (step.type === 'multiselect') {
    addOptions(step.options, true);
    inputEl.disabled = true;
    sendBtn.disabled = true;
  } else if (step.type === 'tags') {
    addTagInput(step.field, step.placeholder || 'Add item...', step.optional);
    inputEl.disabled = true;
    sendBtn.disabled = true;
  } else {
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

function displayInputValue(value, step) {
  if (Array.isArray(value)) {
    if (value.length) addMessage(value.join(', '), 'user');
    else if (!step.optional) addMessage('(none)', 'user');
  } else {
    addMessage(String(value), 'user');
  }
}

/** Returns true if mode was handled (caller should return). */
async function handlePreCheckMode(value) {
  if (value === 'upload') { await handleUploadMode(); return true; }
  if (value === 'bare') { await handleBareMode(); return true; }
  return false;
}

async function handleSummaryConfirmation(value) {
  if (value === 'yes') {
    await createProfile();
  } else {
    currentStep = 0;
    userData = {
      name: '', github_id: authData?.username || '', roles: [], org_name: '', org_role: '',
      style: [], key_refs: [], heroes: [], planning_mode: 'important',
      verbosity: 'concise', emoji: false,
    };
    messagesEl.innerHTML = '';
    showStep(steps[0]);
  }
}

async function handleInput(value) {
  stopCountdown();
  const step = steps[currentStep];

  if (step.transform) value = step.transform(value);

  if (step.validate && !step.validate(value)) {
    addMessage(step.errorMsg || 'Hmm, that doesn\'t look quite right. Try again?', 'rutherford');
    if (step.countdown) startCountdown(step.countdown);
    return;
  }

  displayInputValue(value, step);

  if (step.field && step.field !== 'confirm') {
    userData[step.field] = value;
  }

  if (step.id === 'pre_check' && await handlePreCheckMode(value)) return;

  if (step.id === 'summary') {
    await handleSummaryConfirmation(value);
    return;
  }

  // Next step
  currentStep++;
  inputEl.value = '';
  inputEl.disabled = true;
  sendBtn.disabled = true;

  if (currentStep < steps.length) {
    showStep(steps[currentStep]);
  }
}

async function handleUploadMode() {
  addMessage("Ah, a returning soul! Let me generate an API key for you. You can use this to upload your local profile.", 'rutherford');

  // First create a bare profile so we have something to attach the API key to
  userData.name = authData.username;
  userData.org_name = 'independent';
  userData.org_role = 'user';

  try {
    // Create bare profile first
    const signupResponse = await fetch(`${API_BASE}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const signupResult = await signupResponse.json();

    if (!signupResult.success && signupResult.error !== 'User already exists') {
      addMessage(`Hmm, something went wrong: ${signupResult.error}`, 'rutherford');
      return;
    }

    // Now generate API key
    const keyResponse = await fetch(`${API_BASE}/api/profile/${authData.github_login}/api-key`, {
      method: 'POST',
    });

    const keyResult = await keyResponse.json();

    if (keyResult.success) {
      const keyHtml = `
        <div class="api-key-display">
          <span class="label">Your API Key (save this!):</span>
          ${keyResult.api_key}
        </div>
        <button class="copy-btn" onclick="navigator.clipboard.writeText('${keyResult.api_key}').then(() => this.textContent = 'Copied!')">Copy to Clipboard</button>
      `;
      addMessage(`Here's your API key. Use it with the X-API-Key header to upload your local profile:

\`\`\`bash
curl -X PUT https://cordelia-seed-drill.fly.dev/api/hot/${authData.github_login} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d @memory/L1-hot/${authData.github_login}.json
\`\`\`

${keyHtml}

Once uploaded, refresh this page to see your profile!`, 'rutherford', true);
    } else {
      addMessage(`Failed to generate API key: ${keyResult.error}`, 'rutherford');
    }
  } catch (error) {
    addMessage(`Error: ${error.message}`, 'rutherford');
  }
}

async function handleBareMode() {
  addMessage("A minimalist! I respect that. Creating a bare account for you...", 'rutherford');

  userData.name = authData.github_login;
  userData.org_name = 'independent';
  userData.org_role = 'user';

  try {
    const response = await fetch(`${API_BASE}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const result = await response.json();

    if (result.success) {
      addMessage(`Done! Your bare account is ready. You can always update your profile later. Redirecting to dashboard...`, 'rutherford');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else if (result.error === 'User already exists') {
      addMessage(`You already have a profile! Taking you to the dashboard...`, 'rutherford');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      addMessage(`Something went wrong: ${result.error}`, 'rutherford');
    }
  } catch (error) {
    addMessage(`Error creating account: ${error.message}`, 'rutherford');
  }
}

async function createProfile() {
  addMessage('Creating your Cordelia profile... This is the genesis of your memory.', 'rutherford');

  try {
    const response = await fetch(`${API_BASE}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const result = await response.json();

    if (result.success) {
      addMessage(`And there was light! Welcome to Cordelia, ${userData.name}. Your memory awaits. Redirecting you now...`, 'rutherford');
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
    } else if (result.error === 'User already exists') {
      addMessage(`Interesting - looks like you already have a profile! Let me take you to the dashboard.`, 'rutherford');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      addMessage(`Something went wrong: ${result.error}. Shall we try again?`, 'rutherford');
    }
  } catch (error) {
    addMessage(`Error creating profile: ${error.message}. The land of confusion indeed...`, 'rutherford');
  }
}

// Check auth and initialize
async function init() {
  try {
    const response = await fetch(`${API_BASE}/auth/status`);
    authData = await response.json();

    if (!authData.authenticated) {
      // Not logged in, redirect to main page
      window.location.href = '/';
      return;
    }

    // Show user in header (use username which works for both auth types)
    headerUser.innerHTML = `<span style="font-size: 0.9rem; opacity: 0.9;">@${authData.username}</span>`;

    // Pre-fill user identifier from auth (github_login for GitHub, username for local)
    userData.github_id = authData.username;

    // Check if user already has a profile
    if (authData.cordelia_user) {
      // Already has a profile, redirect to dashboard
      window.location.href = '/';
      return;
    }

    // Start the genesis conversation
    showStep(steps[0]);

  } catch (error) {
    console.error('Init error:', error);
    addMessage('Having trouble connecting. Please refresh the page.', 'rutherford');
  }
}

// Event listeners
sendBtn.onclick = () => {
  const value = inputEl.value.trim();
  if (value) handleInput(value);
};

inputEl.onkeydown = (e) => {
  if (e.key === 'Enter' && !inputEl.disabled) {
    const value = inputEl.value.trim();
    if (value) handleInput(value);
  }
};

// Initialize
await init();
