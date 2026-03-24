/* ===================================================================
   Hostel Lunch Management System — app.js
   Full-stack version with API calls, JWT auth, Socket.io
   =================================================================== */

// ===== CONSTANTS =====
const COLLEGES = [
  'Galgotia College', 'KCC College', 'GL Bajaj College',
  'GNAT College', 'AIMS College', 'Mangalmay College'
];

// ===== UTILITY =====
function todayStr() { return new Date().toISOString().split('T')[0]; }
function formatDate(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h); const ampm = hr >= 12 ? 'PM' : 'AM';
  return `${hr % 12 || 12}:${m} ${ampm}`;
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== PAGE NAVIGATION =====
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
  window.scrollTo(0, 0);
}

function logout() {
  API.clearToken();
  showPage('landing-page');
  showToast('Logged out successfully.');
}

// ===============================================================
//  STUDENT
// ===============================================================
async function studentLogin(e) {
  e.preventDefault();
  const phone = document.getElementById('sl-phone').value.trim();
  const password = document.getElementById('sl-password').value;
  const errEl = document.getElementById('student-login-error');
  errEl.textContent = '';

  try {
    const data = await API.post('/auth/student/login', { phone, password });
    API.setToken(data.token);
    API.setUser('student', data.user);
    await loadStudentDashboard(data.user);
    showPage('student-dashboard-page');
  } catch (err) {
    errEl.textContent = err.message;
  }
  return false;
}

async function studentRegister(e) {
  e.preventDefault();
  const errEl = document.getElementById('register-error');
  errEl.textContent = '';

  const body = {
    name: document.getElementById('reg-name').value.trim(),
    phone: document.getElementById('reg-phone').value.trim(),
    password: document.getElementById('reg-password').value,
    college: document.getElementById('reg-college').value,
    roomNumber: document.getElementById('reg-room').value.trim(),
    lunchTime: document.getElementById('reg-time').value
  };

  try {
    await API.post('/auth/student/register', body);
    showToast('Registration submitted! Wait for admin approval.');
    showPage('student-login-page');
  } catch (err) {
    errEl.textContent = err.message;
  }
  return false;
}

async function loadStudentDashboard(user) {
  document.getElementById('student-name-display').textContent = user.name;
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-phone').textContent = user.phone;
  document.getElementById('profile-college').textContent = user.college;
  document.getElementById('profile-room').textContent = user.roomNumber;
  document.getElementById('profile-time').textContent = formatTime(user.lunchTime);
  document.getElementById('profile-status').textContent = user.status;

  const today = todayStr();
  document.getElementById('today-date').textContent = formatDate(today);

  try {
    const bookings = await API.get('/bookings/today');
    const todayBooking = bookings.find(b => b.date === today);
    const actionArea = document.getElementById('booking-action-area');

    if (todayBooking) {
      let statusText = '📦 Booked';
      if (todayBooking.status === 'delivered') statusText = '✅ Delivered';
      if (todayBooking.status === 'returned') statusText = '🔁 Returned';

      actionArea.innerHTML = `
        <div class="booking-status">
          <span class="status-badge status-${todayBooking.status}">${statusText}</span>
          ${todayBooking.status === 'booked' ? `<button class="btn btn-sm btn-danger" onclick="cancelBooking('${todayBooking._id}')">Cancel Booking</button>` : ''}
        </div>`;
    } else {
      actionArea.innerHTML = `<button class="btn btn-primary btn-block" onclick="bookLunch()">🍱 Book Lunch for Today</button>`;
    }
  } catch (err) {
    console.error('Error loading bookings:', err);
  }
}

async function bookLunch() {
  try {
    await API.post('/bookings', { date: todayStr() });
    showToast('🍱 Lunch booked for today!');
    const user = API.getUser();
    await loadStudentDashboard(user);
  } catch (err) {
    showToast('⚠️ ' + err.message);
  }
}

async function cancelBooking(id) {
  try {
    await API.delete('/bookings/' + id);
    showToast('Booking cancelled.');
    const user = API.getUser();
    await loadStudentDashboard(user);
  } catch (err) {
    showToast('⚠️ ' + err.message);
  }
}

// ===============================================================
//  DELIVERY MAN
// ===============================================================
let deliverySearchTerm = '';

async function deliveryLogin(e) {
  e.preventDefault();
  const phone = document.getElementById('dl-phone').value.trim();
  const password = document.getElementById('dl-password').value;
  const errEl = document.getElementById('delivery-login-error');
  errEl.textContent = '';

  try {
    const data = await API.post('/auth/delivery/login', { phone, password });
    API.setToken(data.token);
    API.setUser('delivery', data.user);
    await loadDeliveryDashboard(data.user);
    showPage('delivery-dashboard-page');
  } catch (err) {
    errEl.textContent = err.message;
  }
  return false;
}

async function loadDeliveryDashboard(dm) {
  document.getElementById('delivery-name-display').textContent = dm.name;
  document.getElementById('delivery-welcome-name').textContent = dm.name;
  document.getElementById('delivery-colleges').textContent = dm.colleges.length > 0 ? dm.colleges.join(', ') : 'None assigned';

  try {
    const bookings = await API.get('/bookings/today');
    const booked = bookings.filter(b => b.status === 'booked').length;
    const delivered = bookings.filter(b => b.status === 'delivered' || b.status === 'returned').length;

    document.getElementById('delivery-summary-row').innerHTML = `
      <div class="summary-card"><div class="count count-booked">${bookings.length}</div><div class="label">Total Assigned</div></div>
      <div class="summary-card"><div class="count count-delivered">${delivered}</div><div class="label">Delivered</div></div>
      <div class="summary-card"><div class="count count-missing">${booked}</div><div class="label">Pending Delivery</div></div>
    `;

    renderDeliveryStudents(bookings);
  } catch (err) {
    console.error('Error loading delivery dashboard:', err);
  }
}

function deliverySearchStudents() {
  deliverySearchTerm = document.getElementById('delivery-search-input').value.trim().toLowerCase();
  loadDeliveryDashboard(API.getUser());
}

function renderDeliveryStudents(bookings) {
  let rows = bookings.filter(b => b.student);

  if (deliverySearchTerm) {
    rows = rows.filter(r =>
      r.student.phone.toLowerCase().includes(deliverySearchTerm) ||
      r.student.roomNumber.toLowerCase().includes(deliverySearchTerm) ||
      r.student.name.toLowerCase().includes(deliverySearchTerm)
    );
  }

  const container = document.getElementById('delivery-student-list');
  if (rows.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No students found.</p></div>';
    return;
  }

  container.innerHTML = rows.map(r => {
    const s = r.student;
    const isDelivered = r.status === 'delivered' || r.status === 'returned';
    const statusBadge = isDelivered
      ? '<span class="status-badge status-delivered">✅ Delivered</span>'
      : '<span class="status-badge status-booked">📦 Booked</span>';
    const actionBtn = isDelivered ? '' : `<button class="btn btn-sm btn-success" onclick="markDelivered('${r._id}')">🚚 Mark Delivered</button>`;

    return `
      <div class="student-row">
        <div class="student-info">
          <span class="student-name">${s.name}</span>
          <span class="student-detail">📱 ${s.phone} · 🎓 ${s.college} · 🏠 Room ${s.roomNumber} · 🕐 ${formatTime(s.lunchTime)}</span>
        </div>
        <div class="student-actions">
          ${statusBadge}
          <a href="tel:${s.phone}" class="btn btn-call">Call</a>
          ${actionBtn}
        </div>
      </div>`;
  }).join('');
}

async function markDelivered(bookingId) {
  try {
    await API.put('/bookings/' + bookingId + '/deliver');
    showToast('🚚 Marked as delivered!');
    await loadDeliveryDashboard(API.getUser());
  } catch (err) {
    showToast('⚠️ ' + err.message);
  }
}

// ===============================================================
//  DESK OPERATOR
// ===============================================================
let deskSearchTerm = '';
let deskCollegeFilter = 'all';
let deskStatusFilter = 'pending';

async function deskLogin(e) {
  e.preventDefault();
  const phone = document.getElementById('dkl-phone').value.trim();
  const password = document.getElementById('dkl-password').value;
  const errEl = document.getElementById('desk-login-error');
  errEl.textContent = '';

  try {
    const data = await API.post('/auth/desk/login', { phone, password });
    API.setToken(data.token);
    API.setUser('desk', data.user);
    await loadDeskDashboard(data.user);
    showPage('desk-dashboard-page');
  } catch (err) {
    errEl.textContent = err.message;
  }
  return false;
}

async function loadDeskDashboard(op) {
  document.getElementById('desk-name-display').textContent = op.name;
  document.getElementById('desk-welcome-name').textContent = op.name;

  try {
    const bookings = await API.get('/bookings/today');
    const allBookings = bookings.filter(b => b.status === 'delivered' || b.status === 'returned');

    const delivered = allBookings.length;
    const returned = allBookings.filter(b => b.status === 'returned').length;
    const pendingReturn = allBookings.filter(b => b.status === 'delivered').length;

    document.getElementById('desk-summary-row').innerHTML = `
      <div class="summary-card"><div class="count count-delivered">${delivered}</div><div class="label">Total Delivered</div></div>
      <div class="summary-card"><div class="count count-returned">${returned}</div><div class="label">Returned</div></div>
      <div class="summary-card"><div class="count count-missing">${pendingReturn}</div><div class="label">Pending Return</div></div>
    `;

    // Build college tabs
    const collegeCounts = {};
    COLLEGES.forEach(c => collegeCounts[c] = { total: 0 });
    allBookings.forEach(b => {
      if (collegeCounts[b.college]) collegeCounts[b.college].total++;
    });

    let tabsHtml = `<button class="desk-college-btn ${deskCollegeFilter === 'all' ? 'active' : ''}" onclick="setDeskCollegeFilter('all')">All Colleges <span class="badge">${allBookings.length}</span></button>`;
    COLLEGES.forEach(c => {
      const count = collegeCounts[c].total;
      if (count > 0) {
        tabsHtml += `<button class="desk-college-btn ${deskCollegeFilter === c ? 'active' : ''}" onclick="setDeskCollegeFilter('${c}')">${c.replace(' College','')} <span class="badge">${count}</span></button>`;
      }
    });
    document.getElementById('desk-college-tabs').innerHTML = tabsHtml;

    // Highlight active status filter
    document.querySelectorAll('.desk-filter-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById('desk-filter-' + deskStatusFilter);
    if (activeBtn) activeBtn.classList.add('active');

    renderDeskStudents(allBookings);
  } catch (err) {
    console.error('Error loading desk dashboard:', err);
  }
}

function setDeskCollegeFilter(college) {
  deskCollegeFilter = college;
  loadDeskDashboard(API.getUser());
}

function setDeskStatusFilter(status) {
  deskStatusFilter = status;
  loadDeskDashboard(API.getUser());
}

function deskSearchStudents() {
  deskSearchTerm = document.getElementById('desk-search-input').value.trim().toLowerCase();
  loadDeskDashboard(API.getUser());
}

function renderDeskStudents(allBookings) {
  let filtered = [...allBookings];

  if (deskStatusFilter === 'pending') filtered = filtered.filter(b => b.status === 'delivered');
  else if (deskStatusFilter === 'returned') filtered = filtered.filter(b => b.status === 'returned');

  if (deskCollegeFilter !== 'all') filtered = filtered.filter(b => b.college === deskCollegeFilter);

  let rows = filtered.filter(b => b.student);

  if (deskSearchTerm) {
    rows = rows.filter(r =>
      r.student.phone.toLowerCase().includes(deskSearchTerm) ||
      r.student.roomNumber.toLowerCase().includes(deskSearchTerm) ||
      r.student.name.toLowerCase().includes(deskSearchTerm)
    );
  }

  const tbody = document.getElementById('desk-student-list');
  const emptyState = document.getElementById('desk-empty-state');
  const tableEl = document.getElementById('desk-student-table');
  const countEl = document.getElementById('desk-results-count');

  countEl.textContent = `Showing ${rows.length} student${rows.length !== 1 ? 's' : ''}`;

  if (rows.length === 0) {
    tableEl.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.querySelector('p').textContent = deskSearchTerm
      ? '🔍 No students match your search.'
      : (deskStatusFilter === 'pending' ? '🎉 All lunchboxes returned!' : 'No records found.');
    return;
  }

  tableEl.style.display = '';
  emptyState.style.display = 'none';

  tbody.innerHTML = rows.map(r => {
    const s = r.student;
    const isReturned = r.status === 'returned';
    const rowClass = isReturned ? 'desk-row-returned' : 'desk-row-pending';
    const statusBadge = isReturned
      ? '<span class="status-badge status-returned">🟢 Returned</span>'
      : '<span class="status-badge status-missing">🔴 Not Returned</span>';
    const actionBtn = isReturned
      ? '<span style="color:#51cf66;font-size:.85rem;">✅ Done</span>'
      : `<button class="btn btn-sm btn-warning" onclick="markReturnedDesk('${r._id}')">🔁 Return</button>`;

    return `
      <tr class="${rowClass}">
        <td class="td-name">${s.name}</td>
        <td>${s.phone}</td>
        <td>${s.roomNumber}</td>
        <td><span class="desk-college-tag">${s.college.replace(' College','')}</span></td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>
      </tr>`;
  }).join('');
}

async function markReturnedDesk(bookingId) {
  try {
    await API.put('/bookings/' + bookingId + '/return');
    showToast('🔁 Lunchbox marked as returned!');
    await loadDeskDashboard(API.getUser());
  } catch (err) {
    showToast('⚠️ ' + err.message);
  }
}

// ===============================================================
//  ADMIN
// ===============================================================
async function adminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('admin-user').value.trim();
  const password = document.getElementById('admin-pass').value;
  const errEl = document.getElementById('admin-login-error');
  errEl.textContent = '';

  try {
    const data = await API.post('/auth/admin/login', { username, password });
    API.setToken(data.token);
    API.setUser('admin', data.user);
    await loadAdminDashboard();
    showPage('admin-dashboard-page');
  } catch (err) {
    errEl.textContent = err.message;
  }
  return false;
}

async function loadAdminDashboard() {
  switchAdminTab('approvals');
}

function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  const tabEl = document.querySelector(`.admin-tab[onclick*="${tab}"]`);
  if (tabEl) tabEl.classList.add('active');
  const panel = document.getElementById('panel-' + tab);
  if (panel) panel.classList.add('active');

  switch(tab) {
    case 'approvals': adminLoadApprovals(); break;
    case 'students': adminLoadAllStudents(); break;
    case 'lunch': adminLoadLunchCount(); break;
    case 'delivery': adminLoadDeliveryMen(); break;
    case 'deskops': adminLoadDeskOps(); break;
    case 'tracking': adminLoadTracking(); break;
    case 'analytics': adminLoadAnalytics(); break;
  }
}

// --- Pending Approvals ---
async function adminLoadApprovals() {
  try {
    const students = await API.get('/students?status=pending');
    const container = document.getElementById('approval-list');
    if (students.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No pending approvals.</p></div>';
      return;
    }
    container.innerHTML = students.map(s => `
      <div class="student-row">
        <div class="student-info">
          <span class="student-name">${s.name}</span>
          <span class="student-detail">📱 ${s.phone} · 🎓 ${s.college} · 🏠 Room ${s.roomNumber} · 🕐 ${formatTime(s.lunchTime)}</span>
        </div>
        <div class="student-actions">
          <button class="btn btn-sm btn-success" onclick="approveStudent('${s._id}')">✅ Approve</button>
          <button class="btn btn-sm btn-danger" onclick="rejectStudent('${s._id}')">❌ Reject</button>
        </div>
      </div>`).join('');
  } catch (err) {
    console.error(err);
  }
}

async function approveStudent(id) {
  try {
    await API.put('/students/' + id + '/approve');
    showToast('Student approved!');
    adminLoadApprovals();
  } catch (err) { showToast('⚠️ ' + err.message); }
}

async function rejectStudent(id) {
  try {
    await API.put('/students/' + id + '/reject');
    showToast('Student rejected.');
    adminLoadApprovals();
  } catch (err) { showToast('⚠️ ' + err.message); }
}

// --- All Students ---
let adminStudentSearch = '';
async function adminLoadAllStudents() {
  try {
    const searchParam = adminStudentSearch ? `&search=${encodeURIComponent(adminStudentSearch)}` : '';
    const students = await API.get('/students?status=approved' + searchParam);
    const container = document.getElementById('all-students-list');
    if (students.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No approved students found.</p></div>';
      return;
    }
    container.innerHTML = students.map(s => `
      <div class="student-row">
        <div class="student-info">
          <span class="student-name">${s.name}</span>
          <span class="student-detail">📱 ${s.phone} · 🎓 ${s.college} · 🏠 Room ${s.roomNumber} · 🕐 ${formatTime(s.lunchTime)}</span>
        </div>
        <div class="student-actions">
          <a href="tel:${s.phone}" class="btn btn-call">Call</a>
          <button class="btn btn-sm btn-danger" onclick="removeStudent('${s._id}')">Remove</button>
        </div>
      </div>`).join('');
  } catch (err) { console.error(err); }
}

function adminSearchStudents() {
  adminStudentSearch = document.getElementById('admin-student-search').value.trim();
  adminLoadAllStudents();
}

async function removeStudent(id) {
  try {
    await API.delete('/students/' + id);
    showToast('Student removed.');
    adminLoadAllStudents();
  } catch (err) { showToast('⚠️ ' + err.message); }
}

// --- Lunch Count ---
async function adminLoadLunchCount() {
  try {
    const date = document.getElementById('admin-lunch-date')?.value || todayStr();
    const bookings = await API.get('/bookings/today?date=' + date);

    const collegeCounts = {};
    COLLEGES.forEach(c => collegeCounts[c] = 0);
    bookings.forEach(b => { if (collegeCounts[b.college] !== undefined) collegeCounts[b.college]++; });

    document.getElementById('lunch-count-grid').innerHTML = COLLEGES.map(c => `
      <div class="count-card">
        <div class="count-number">${collegeCounts[c]}</div>
        <div class="count-label">${c}</div>
      </div>`).join('') + `
      <div class="count-card total-card">
        <div class="count-number">${bookings.length}</div>
        <div class="count-label">Total</div>
      </div>`;
  } catch (err) { console.error(err); }
}

// --- Delivery Men ---
async function adminLoadDeliveryMen() {
  try {
    const men = await API.get('/deliverymen');
    const container = document.getElementById('delivery-men-list');
    if (men.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No delivery men added yet.</p></div>';
      return;
    }
    container.innerHTML = men.map(dm => `
      <div class="deliveryman-card">
        <div class="dm-info">
          <span class="dm-name">🚚 ${dm.name}</span>
          <span class="dm-detail">📱 ${dm.phone} · Colleges: ${dm.colleges.length > 0 ? dm.colleges.join(', ') : 'None assigned'}</span>
        </div>
        <div class="dm-actions">
          <button class="btn btn-sm btn-primary" onclick="editDeliveryMan('${dm._id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteDeliveryMan('${dm._id}')">Delete</button>
        </div>
      </div>`).join('');
  } catch (err) { console.error(err); }
}

function showAddDeliveryManForm() {
  document.getElementById('add-dm-form').style.display = 'block';
  document.getElementById('save-dm-btn').removeAttribute('data-edit-id');
  document.getElementById('save-dm-btn').textContent = 'Save';
  document.getElementById('adm-dm-name').value = '';
  document.getElementById('adm-dm-phone').value = '';
  document.getElementById('adm-dm-password').value = '';
  const checkboxes = document.querySelectorAll('.college-checkbox');
  checkboxes.forEach(cb => cb.checked = false);
}

function hideAddDeliveryManForm() {
  document.getElementById('add-dm-form').style.display = 'none';
}

async function saveDeliveryMan() {
  const name = document.getElementById('adm-dm-name').value.trim();
  const phone = document.getElementById('adm-dm-phone').value.trim();
  const password = document.getElementById('adm-dm-password').value;
  const colleges = [];
  document.querySelectorAll('.college-checkbox:checked').forEach(cb => colleges.push(cb.value));

  if (!name || !phone) { showToast('Name and phone required.'); return; }

  const editId = document.getElementById('save-dm-btn').getAttribute('data-edit-id');
  try {
    if (editId) {
      const body = { name, phone, colleges };
      if (password) body.password = password;
      await API.put('/deliverymen/' + editId, body);
      showToast('Delivery man updated!');
    } else {
      if (!password) { showToast('Password required.'); return; }
      await API.post('/deliverymen', { name, phone, password, colleges });
      showToast('Delivery man added!');
    }
    hideAddDeliveryManForm();
    adminLoadDeliveryMen();
  } catch (err) { showToast('⚠️ ' + err.message); }
}

async function editDeliveryMan(id) {
  try {
    const men = await API.get('/deliverymen');
    const dm = men.find(d => d._id === id);
    if (!dm) return;

    showAddDeliveryManForm();
    document.getElementById('adm-dm-name').value = dm.name;
    document.getElementById('adm-dm-phone').value = dm.phone;
    document.getElementById('adm-dm-password').value = '';
    document.querySelectorAll('.college-checkbox').forEach(cb => {
      cb.checked = dm.colleges.includes(cb.value);
    });
    document.getElementById('save-dm-btn').setAttribute('data-edit-id', id);
    document.getElementById('save-dm-btn').textContent = 'Update';
  } catch (err) { console.error(err); }
}

async function deleteDeliveryMan(id) {
  try {
    await API.delete('/deliverymen/' + id);
    showToast('Delivery man removed.');
    adminLoadDeliveryMen();
  } catch (err) { showToast('⚠️ ' + err.message); }
}

// --- Desk Operators ---
async function adminLoadDeskOps() {
  try {
    const ops = await API.get('/deskoperators');
    const container = document.getElementById('desk-ops-list');
    if (ops.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No desk operators added yet.</p></div>';
      return;
    }
    container.innerHTML = ops.map(op => `
      <div class="deliveryman-card">
        <div class="dm-info">
          <span class="dm-name">🏪 ${op.name}</span>
          <span class="dm-detail">📱 ${op.phone}</span>
        </div>
        <div class="dm-actions">
          <button class="btn btn-sm btn-primary" onclick="editDeskOp('${op._id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteDeskOp('${op._id}')">Delete</button>
        </div>
      </div>`).join('');
  } catch (err) { console.error(err); }
}

function showAddDeskOpForm() {
  document.getElementById('add-deskop-form').style.display = 'block';
  document.getElementById('save-deskop-btn').removeAttribute('data-edit-id');
  document.getElementById('save-deskop-btn').textContent = 'Save';
  document.getElementById('adm-do-name').value = '';
  document.getElementById('adm-do-phone').value = '';
  document.getElementById('adm-do-password').value = '';
}

function hideAddDeskOpForm() {
  document.getElementById('add-deskop-form').style.display = 'none';
}

async function saveDeskOp() {
  const name = document.getElementById('adm-do-name').value.trim();
  const phone = document.getElementById('adm-do-phone').value.trim();
  const password = document.getElementById('adm-do-password').value;

  if (!name || !phone) { showToast('Name and phone required.'); return; }

  const editId = document.getElementById('save-deskop-btn').getAttribute('data-edit-id');
  try {
    if (editId) {
      const body = { name, phone };
      if (password) body.password = password;
      await API.put('/deskoperators/' + editId, body);
      showToast('Desk operator updated!');
    } else {
      if (!password) { showToast('Password required.'); return; }
      await API.post('/deskoperators', { name, phone, password });
      showToast('Desk operator added!');
    }
    hideAddDeskOpForm();
    adminLoadDeskOps();
  } catch (err) { showToast('⚠️ ' + err.message); }
}

async function editDeskOp(id) {
  try {
    const ops = await API.get('/deskoperators');
    const op = ops.find(d => d._id === id);
    if (!op) return;

    showAddDeskOpForm();
    document.getElementById('adm-do-name').value = op.name;
    document.getElementById('adm-do-phone').value = op.phone;
    document.getElementById('adm-do-password').value = '';
    document.getElementById('save-deskop-btn').setAttribute('data-edit-id', id);
    document.getElementById('save-deskop-btn').textContent = 'Update';
  } catch (err) { console.error(err); }
}

async function deleteDeskOp(id) {
  try {
    await API.delete('/deskoperators/' + id);
    showToast('Desk operator deleted.');
    adminLoadDeskOps();
  } catch (err) { showToast('⚠️ ' + err.message); }
}

// --- Box Tracking ---
async function adminLoadTracking() {
  try {
    const date = document.getElementById('admin-tracking-date')?.value || todayStr();
    const bookings = await API.get('/bookings/today?date=' + date);

    const total = bookings.length;
    const delivered = bookings.filter(b => b.status === 'delivered' || b.status === 'returned').length;
    const returned = bookings.filter(b => b.status === 'returned').length;
    const missing = bookings.filter(b => b.status === 'delivered').length;

    document.getElementById('admin-tracking-summary').innerHTML = `
      <div class="summary-card"><div class="count count-booked">${total}</div><div class="label">Total Booked</div></div>
      <div class="summary-card"><div class="count count-delivered">${delivered}</div><div class="label">Delivered</div></div>
      <div class="summary-card"><div class="count count-returned">${returned}</div><div class="label">Returned</div></div>
      <div class="summary-card"><div class="count count-missing">${missing}</div><div class="label">Unreturned</div></div>
    `;

    const trackingList = document.getElementById('admin-tracking-list');
    if (bookings.length === 0) {
      trackingList.innerHTML = '<div class="empty-state"><p>No bookings for this date.</p></div>';
      return;
    }

    trackingList.innerHTML = bookings.map(b => {
      const s = b.student;
      if (!s) return '';
      let badge = '<span class="status-badge status-booked">📦 Booked</span>';
      if (b.status === 'delivered') badge = '<span class="status-badge status-delivered">✅ Delivered</span>';
      if (b.status === 'returned') badge = '<span class="status-badge status-returned">🔁 Returned</span>';
      return `
        <div class="student-row">
          <div class="student-info">
            <span class="student-name">${s.name}</span>
            <span class="student-detail">📱 ${s.phone} · 🎓 ${s.college} · 🏠 Room ${s.roomNumber}</span>
          </div>
          <div class="student-actions">${badge}</div>
        </div>`;
    }).join('');
  } catch (err) { console.error(err); }
}

// --- Analytics ---
async function adminLoadAnalytics() {
  try {
    const [summary, daily, college, peakHours] = await Promise.all([
      API.get('/analytics/summary'),
      API.get('/analytics/daily'),
      API.get('/analytics/college'),
      API.get('/analytics/peak-hours')
    ]);

    // Summary cards
    document.getElementById('analytics-summary').innerHTML = `
      <div class="summary-card"><div class="count count-booked">${summary.totalStudents}</div><div class="label">Total Students</div></div>
      <div class="summary-card"><div class="count count-delivered">${summary.todayBookings}</div><div class="label">Today's Bookings</div></div>
      <div class="summary-card"><div class="count" style="color:#51cf66">${summary.deliveryRate}%</div><div class="label">Delivery Rate</div></div>
      <div class="summary-card"><div class="count" style="color:#ffd43b">${summary.returnRate}%</div><div class="label">Return Rate</div></div>
    `;

    // Daily trends chart
    if (window.dailyChart) window.dailyChart.destroy();
    const dailyCtx = document.getElementById('daily-chart').getContext('2d');
    window.dailyChart = new Chart(dailyCtx, {
      type: 'line',
      data: {
        labels: daily.map(d => d.date.slice(5)),
        datasets: [
          { label: 'Booked', data: daily.map(d => d.booked), borderColor: '#7c6ff7', backgroundColor: 'rgba(124,111,247,.1)', tension: 0.3, fill: true },
          { label: 'Delivered', data: daily.map(d => d.delivered), borderColor: '#51cf66', backgroundColor: 'rgba(81,207,102,.1)', tension: 0.3, fill: true },
          { label: 'Returned', data: daily.map(d => d.returned), borderColor: '#ffd43b', backgroundColor: 'rgba(255,212,59,.1)', tension: 0.3, fill: true }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#ccc' } } },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,.05)' }, beginAtZero: true }
        }
      }
    });

    // College breakdown chart
    if (window.collegeChart) window.collegeChart.destroy();
    const collegeCtx = document.getElementById('college-chart').getContext('2d');
    window.collegeChart = new Chart(collegeCtx, {
      type: 'bar',
      data: {
        labels: college.map(c => c.college.replace(' College','')),
        datasets: [
          { label: 'Booked', data: college.map(c => c.booked), backgroundColor: '#7c6ff7' },
          { label: 'Delivered', data: college.map(c => c.delivered), backgroundColor: '#51cf66' },
          { label: 'Returned', data: college.map(c => c.returned), backgroundColor: '#ffd43b' }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#ccc' } } },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,.05)' }, beginAtZero: true }
        }
      }
    });

    // Peak hours chart
    if (window.peakChart) window.peakChart.destroy();
    const peakCtx = document.getElementById('peak-chart').getContext('2d');
    window.peakChart = new Chart(peakCtx, {
      type: 'bar',
      data: {
        labels: peakHours.map(h => h.hour),
        datasets: [{ label: 'Students', data: peakHours.map(h => h.count), backgroundColor: '#74b9ff' }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#ccc' } } },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,.05)' }, beginAtZero: true }
        }
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
  }
}

// ===============================================================
//  SOCKET.IO REAL-TIME
// ===============================================================
function initSocket() {
  const socket = io();

  socket.on('connect', () => console.log('🔌 Socket connected'));

  socket.on('booking:new', () => refreshDashboard());
  socket.on('booking:cancel', () => refreshDashboard());
  socket.on('booking:delivered', () => refreshDashboard());
  socket.on('booking:returned', () => refreshDashboard());
  socket.on('student:approved', () => refreshDashboard());
}

function refreshDashboard() {
  const role = API.getRole();
  const user = API.getUser();
  if (!role || !user) return;

  switch(role) {
    case 'student': loadStudentDashboard(user); break;
    case 'delivery': loadDeliveryDashboard(user); break;
    case 'desk': loadDeskDashboard(user); break;
    case 'admin': {
      const activePanel = document.querySelector('.admin-panel.active');
      if (activePanel) {
        const tab = activePanel.id.replace('panel-', '');
        switchAdminTab(tab);
      }
      break;
    }
  }
}

// ===============================================================
//  INIT
// ===============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Init socket
  initSocket();

  // Check for existing token
  const token = API.getToken();
  const role = API.getRole();
  if (token && role) {
    try {
      const data = await API.get('/auth/me');
      API.setUser(data.role, data.user);

      switch(data.role) {
        case 'student':
          await loadStudentDashboard(data.user);
          showPage('student-dashboard-page');
          return;
        case 'delivery':
          await loadDeliveryDashboard(data.user);
          showPage('delivery-dashboard-page');
          return;
        case 'desk':
          await loadDeskDashboard(data.user);
          showPage('desk-dashboard-page');
          return;
        case 'admin':
          await loadAdminDashboard();
          showPage('admin-dashboard-page');
          return;
      }
    } catch (err) {
      API.clearToken();
    }
  }
});
