const personalList = document.getElementById('personal-list');
const workList = document.getElementById('work-list');
const benefitsPopup = document.getElementById('benefits-popup');
const taskBenefitPopup = document.getElementById('task-benefit-popup');
const taskBenefitTitle = document.getElementById('task-benefit-title');
const taskBenefitText = document.getElementById('task-benefit-text');

const personalTasks = [];
const workTasks = [];
let taskCounter = 0;

const benefitsKeywords = [
  { terms: ['mental health', 'therapy', 'counseling', 'counselor'], benefit: 'Employee Assistance Program (EAP) with up to 6 free counseling sessions per issue' },
  { terms: ['health', 'medical', 'doctor', 'vaccine', 'screening', 'physical', 'telehealth'], benefit: 'health insurance, preventive care, and telehealth services' },
  { terms: ['dental', 'dentist'], benefit: 'dental insurance with preventive care covered at 100%' },
  { terms: ['vision', 'glasses', 'contacts', 'eye exam'], benefit: 'vision insurance with an annual eye exam and eyewear allowance' },
  { terms: ['retirement', '401k', '401(k)'], benefit: '401(k) retirement benefits with a company match' },
  { terms: ['life insurance'], benefit: 'basic life insurance at 1x annual salary' },
  { terms: ['disability'], benefit: 'short-term and long-term disability coverage' },
  { terms: ['pto', 'vacation', 'time off'], benefit: 'paid time off (PTO)' },
  { terms: ['holiday', 'holidays'], benefit: '10 paid company holidays per year' },
  { terms: ['sick', 'illness'], benefit: 'paid sick leave separate from PTO' },
  { terms: ['parental', 'baby', 'birth', 'caregiver'], benefit: 'paid parental leave for caregivers' },
  { terms: ['hybrid', 'remote', 'flexible schedule', 'flexible'], benefit: 'hybrid work options and flexible start and end times' },
  { terms: ['course', 'courses', 'certification', 'certifications', 'conference', 'school', 'class'], benefit: 'a $1,000 annual professional development stipend' },
  { terms: ['commute', 'commuter', 'transit', 'parking'], benefit: 'pre-tax commuter benefits for transit and parking expenses' }
];

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findBenefitForKeyword(keyword) {
  const normalized = keyword.toLowerCase();
  return benefitsKeywords.find((item) => item.terms.includes(normalized));
}

function getBenefitMessage(benefit) {
  return `We can help you with that! Our organization provides ${benefit} for our employees. Contact HR to set this up.`;
}

function linkBenefitKeywords(title, domain) {
  if (domain !== 'personal') {
    return escapeHTML(title);
  }

  const terms = benefitsKeywords
    .flatMap((item) => item.terms)
    .sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${terms.map(escapeRegExp).join('|')})\\b`, 'gi');

  return escapeHTML(title).replace(pattern, (match) => {
    const benefit = findBenefitForKeyword(match);
    if (!benefit) return match;
    return `<button class="benefit-keyword" type="button" data-benefit="${escapeHTML(benefit.benefit)}">${match}</button>`;
  });
}

function daysUntilDue(task) {
  const due = new Date(`${task.due_date}T23:59:59`);
  const today = new Date();
  return Math.ceil((due - today) / (24 * 60 * 60 * 1000));
}

function getPriorityScore(task) {
  const urgencyScore = (4 - task.urgency_rating) * 100;
  const daysLeft = daysUntilDue(task);
  let deadlineScore = 5;
  if (daysLeft < 0) deadlineScore = 90;
  else if (daysLeft <= 1) deadlineScore = 80;
  else if (daysLeft <= 3) deadlineScore = 65;
  else if (daysLeft <= 7) deadlineScore = 45;
  else if (daysLeft <= 14) deadlineScore = 25;
  return urgencyScore + deadlineScore;
}

function getDueLabel(task) {
  const daysLeft = daysUntilDue(task);
  if (daysLeft < 0) return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`;
  if (daysLeft === 0) return 'Due today';
  if (daysLeft === 1) return 'Due tomorrow';
  return `Due in ${daysLeft} days`;
}

function createTaskCard(task) {
  const urgencyEmoji = task.urgency_rating === 1 ? '🔥' : task.urgency_rating === 2 ? '⚠️' : '😌';
  const card = document.createElement('div');
  card.className = 'task-card';
  card.innerHTML = `
    <strong>${linkBenefitKeywords(task.title, task.domain)}</strong>
    <p>Due: ${escapeHTML(task.due_date)}</p>
    <p>Urgency: ${urgencyEmoji} ${task.urgency_rating}</p>
  `;
  return card;
}

function renderTasks() {
  personalList.innerHTML = '';
  workList.innerHTML = '';
  personalTasks.forEach((task) => personalList.appendChild(createTaskCard(task)));
  workTasks.forEach((task) => workList.appendChild(createTaskCard(task)));
}

function makeTaskObject(prefix, domain) {
  const title = document.getElementById(`${prefix}-title`).value.trim();
  const due_date = document.getElementById(`${prefix}-due`).value;
  const urgency_rating = Number(document.querySelector(`input[name="${prefix}-urgency"]:checked`).value);
  if (!title || !due_date) {
    alert('Please enter a title and due date.');
    return null;
  }
  taskCounter += 1;
  return {
    id: `${domain}-${taskCounter}`,
    title,
    domain,
    due_date,
    urgency_rating,
    ambiguity_score: 0, // Default to 0 since removed from UI
    perceived_importance: 0
  };
}

document.getElementById('add-personal').addEventListener('click', () => {
  const task = makeTaskObject('personal', 'personal');
  if (task) {
    personalTasks.push(task);
    renderTasks();
  }
});

document.getElementById('add-work').addEventListener('click', () => {
  const task = makeTaskObject('work', 'work');
  if (task) {
    workTasks.push(task);
    renderTasks();
  }
});

async function fetchAnalysis(tasks) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks })
  });
  return response.json();
}

function getBenefitSuggestion(task) {
  const title = task.title.toLowerCase();
  if (title.includes('tax')) {
    return 'Company offers a free TurboTax subscription this season to ease your tax prep.';
  }
  if (title.includes('mental health') || title.includes('therapy')) {
    return 'Your company benefits include free mental health counseling through insurance.';
  }
  if (title.includes('presentation') || title.includes('meeting')) {
    return 'Your employer provides coaching tools and slide templates to help you deliver confidently.';
  }
  if (title.includes('supplies') || title.includes('shopping') || title.includes('errand')) {
    return 'The company offers a wellness stipend that can cover personal supplies or errands.';
  }
  if (title.includes('audit') || title.includes('report')) {
    return 'You can tap into internal review support and mentorship for high-stakes work tasks.';
  }
  return 'Company benefits include flexible scheduling, wellness resources, and professional support for this task.';
}

function markTaskResolved(taskId) {
  const personalIndex = personalTasks.findIndex((item) => item.id === taskId);
  if (personalIndex !== -1) {
    personalTasks.splice(personalIndex, 1);
    renderTasks();
    return;
  }
  const workIndex = workTasks.findIndex((item) => item.id === taskId);
  if (workIndex !== -1) {
    workTasks.splice(workIndex, 1);
    renderTasks();
  }
}

function getRepeatStatus(task) {
  const allTasks = [...personalTasks, ...workTasks];
  const sameTitleCount = allTasks.filter((item) => item.title.toLowerCase() === task.title.toLowerCase()).length;
  return sameTitleCount > 1 ? `This appears ${sameTitleCount} times, so it feels like a recurring priority.` : '';
}

function getSupportiveTone(task) {
  const due = new Date(task.due_date);
  const today = new Date();
  const daysLeft = Math.ceil((due - today) / (24 * 60 * 60 * 1000));
  const urgency = task.urgency_rating;
  const note = urgency === 1 ? 'This is important and you’re on the right track by noticing it early.' : urgency === 2 ? 'A steady focus will keep this from building stress later.' : 'You’re balancing this well; keep it manageable.';
  const timing = daysLeft <= 2 ? 'It’s due soon, so a quick check-in is helpful.' : 'You have breathing room; plan one step at a time.';
  return `${note} ${timing}`;
}

function renderMapAnalysis(analysis) {
  const allTasks = [...personalTasks, ...workTasks];
  const priorities = allTasks
    .map((task) => ({
      ...task,
      score: getPriorityScore(task)
    }))
    .sort((a, b) => b.score - a.score || new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  let mapHTML = '<button id="back-to-results">Back to Results</button><h3>MAP Analysis - Supportive Priority Review</h3>';
  mapHTML += '<div class="bar-card">\n        <div class="bar-labels">\n          <span>0</span><span>20</span><span>40</span><span>70</span><span>90</span><span>100</span>\n        </div>\n        <div class="cognitive-bar">\n          <div class="bar-segment calm"></div>\n          <div class="bar-segment light"></div>\n          <div class="bar-segment medium"></div>\n          <div class="bar-segment high"></div>\n          <div class="bar-segment critical"></div>\n          <div class="bar-marker" id="map-load-marker"></div>\n        </div>\n        <div class="bar-range-notes">\n          <span>All least urgent</span>\n          <span>Least + medium</span>\n          <span>Mostly medium</span>\n          <span>Mostly urgent</span>\n          <span>Urgent + near</span>\n        </div>\n        <p id="map-load-text">Cognitive overload score: <strong>—</strong></p>\n        <p class="bar-explain">Fewer total tasks lower cognitive overload within each urgency range.</p>\n      </div>';
  mapHTML += '<div class="summary-card top-priorities-card"><h3>Top 5 priorities</h3><p class="card-note">Ranked by urgency and approaching deadlines.</p><ul class="priority-list">';
  priorities.forEach((task) => {
    const emoji = task.urgency_rating === 1 ? '🔥' : task.urgency_rating === 2 ? '⚠️' : '😌';
    mapHTML += `<li class="priority-item ${task.domain}-task" data-task-id="${task.id}">
      <div class="priority-main">
        <div class="priority-task-title">${emoji} ${linkBenefitKeywords(task.title, task.domain)} <span>(${escapeHTML(task.domain)})</span></div>
        <span class="deadline-pill">${escapeHTML(getDueLabel(task))}</span>
      </div>
      <button class="resolve-task-button" data-task-id="${task.id}">Resolve</button>
      <p>${escapeHTML(getSupportiveTone(task))}</p>
      ${task.domain === 'personal' ? `<p class="repeat-note">${escapeHTML(getRepeatStatus(task))}</p>` : ''}
    </li>`;
  });
  mapHTML += '</ul></div>';
  mapHTML += '<div class="detail-panel"><h3>Task summary</h3><p>Click highlighted words in personal tasks to see company benefits from the policy. Resolved tasks disappear from the list and keep your priorities current.</p></div>';

  document.getElementById('results-panel').innerHTML = mapHTML;
  const loadMarkerLocal = document.getElementById('map-load-marker');
  const loadTextLocal = document.getElementById('map-load-text');
  const load = analysis.cognitive_load.total_load;
  const zone = analysis.cognitive_load.zone;
  loadTextLocal.innerHTML = `Cognitive overload score: <strong>${load}% (${zone})</strong>`;
  loadMarkerLocal.style.left = `${Math.min(Math.max(load, 0), 100)}%`;

  document.getElementById('back-to-results').addEventListener('click', showResultsView);
  document.querySelectorAll('.resolve-task-button').forEach((button) => {
    button.addEventListener('click', (event) => {
      const taskId = event.currentTarget.dataset.taskId;
      markTaskResolved(taskId);
      document.getElementById('map-analysis').click();
    });
  });
}

function showResultsView() {
  document.getElementById('results-panel').innerHTML = `
    <div class="placeholder-card">
      <p>Select Calendar View or MAP Analysis to explore tasks, priorities, and benefits.</p>
    </div>
  `;
}

function renderCalendarView() {
  const allTasks = [...personalTasks, ...workTasks].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  if (!allTasks.length) {
    document.getElementById('results-panel').innerHTML = `
      <button id="back-to-results">Back to Results</button>
      <p class="empty-state">Add at least one task before viewing the calendar.</p>
    `;
    document.getElementById('back-to-results').addEventListener('click', showResultsView);
    return;
  }

  const taskMap = {};
  allTasks.forEach((task) => {
    const dueKey = new Date(task.due_date).toISOString().slice(0, 10);
    if (!taskMap[dueKey]) taskMap[dueKey] = [];
    taskMap[dueKey].push(task);
  });

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 20); // three weeks of days

  let calendarHTML = '<button id="back-to-results">Back to Results</button><h3>Calendar View</h3>';
  calendarHTML += '<div class="calendar-grid">';
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  weekdayLabels.forEach((label) => {
    calendarHTML += `<div class="calendar-head">${label}</div>`;
  });

  for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
    const isoKey = day.toISOString().slice(0, 10);
    const tasksForDay = taskMap[isoKey] || [];
    const isToday = day.toDateString() === new Date().toDateString();
    const cellClasses = ['calendar-cell'];
    if (isToday) cellClasses.push('today');

    calendarHTML += `<div class="${cellClasses.join(' ')}">
      <div class="calendar-date">${day.getDate()}</div>
      ${tasksForDay.length ? '<div class="task-list-inline">' + tasksForDay.map((task) => {
        const emoji = task.urgency_rating === 1 ? '🔥' : task.urgency_rating === 2 ? '⚠️' : '😌';
        return `<div class="calendar-task">${emoji} ${task.title}</div>`;
      }).join('') + '</div>' : '<div class="calendar-empty">No tasks</div>'}
    </div>`;
  }

  calendarHTML += '</div>';
  document.getElementById('results-panel').innerHTML = calendarHTML;
  document.getElementById('back-to-results').addEventListener('click', showResultsView);
}

document.getElementById('calendar-view').addEventListener('click', renderCalendarView);

document.getElementById('map-analysis').addEventListener('click', async () => {
  const tasks = [...personalTasks, ...workTasks];
  if (!tasks.length) {
    alert('Add at least one task before running MAP Analysis.');
    return;
  }
  const payload = await fetchAnalysis(tasks);
  if (!payload.success) {
    alert(payload.message || 'MAP Analysis failed.');
    return;
  }
  renderMapAnalysis(payload.analysis);
});

document.getElementById('close-benefits').addEventListener('click', () => {
  benefitsPopup.classList.add('hidden');
});

document.getElementById('close-task-benefit').addEventListener('click', () => {
  taskBenefitPopup.classList.add('hidden');
});

document.addEventListener('click', (event) => {
  const keywordButton = event.target.closest('.benefit-keyword');
  if (!keywordButton) return;
  event.stopPropagation();
  taskBenefitTitle.textContent = 'Employee benefit';
  taskBenefitText.textContent = getBenefitMessage(keywordButton.dataset.benefit);
  taskBenefitPopup.classList.remove('hidden');
});

window.addEventListener('DOMContentLoaded', () => {
  benefitsPopup.classList.remove('hidden');
  showResultsView();

  const today = new Date();
  const inThree = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const inSeven = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  document.getElementById('personal-due').value = inSeven;
  document.getElementById('work-due').value = inThree;

  personalTasks.push({ id: 'personal-1', title: 'Buy school supplies', domain: 'personal', due_date: inSeven, urgency_rating: 2, ambiguity_score: 0, perceived_importance: 0 });
  workTasks.push({ id: 'work-1', title: 'Prepare audit presentation', domain: 'work', due_date: inThree, urgency_rating: 1, ambiguity_score: 0, perceived_importance: 0 });
  taskCounter = 1;
  renderTasks();
});
