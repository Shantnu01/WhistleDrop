const API_BASE = 'http://localhost:3001/api';
let jwtToken = localStorage.getItem('jwtToken') || null;
let currentReports = [];

// Initial check
if (jwtToken) {
  showDashboard();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    jwtToken = data.token;
    localStorage.setItem('jwtToken', jwtToken);
    showDashboard();

  } catch (error) {
    alert('Login Failed: ' + error.message);
  }
});

async function showDashboard() {
  document.getElementById('login-slide').style.display = 'none';
  document.getElementById('dashboard-slide').style.display = 'flex';
  await loadReports();
}

function logout() {
  jwtToken = null;
  localStorage.removeItem('jwtToken');
  document.getElementById('dashboard-slide').style.display = 'none';
  document.getElementById('login-slide').style.display = 'flex';
}

async function loadReports() {
  try {
    // Add cache-busting timestamp so browser never returns stale responses
    const res = await fetch(`${API_BASE}/reports/moderator/all?page=1&limit=50&_t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    });
    
    if (res.status === 401) {
      logout();
      return;
    }

    const data = await res.json();
    const tbody = document.getElementById('reports-table-body');
    tbody.innerHTML = '';

    currentReports = data.data || data;

    if (!currentReports || currentReports.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#aaa;">No reports submitted yet.</td></tr>';
      return;
    }

    currentReports.forEach(r => {
      const tr = document.createElement('tr');

      // 1. Case Code
      const caseCodeTd = document.createElement('td');
      caseCodeTd.style.fontFamily = 'monospace';
      caseCodeTd.style.fontSize = '1.1rem';
      caseCodeTd.style.fontWeight = 'bold';
      caseCodeTd.textContent = r.case_code;

      // 2. Category
      const categoryTd = document.createElement('td');
      categoryTd.textContent = r.category;

      // 3. Status Badge
      const statusTd = document.createElement('td');
      statusTd.innerHTML = `<span class="badge badge-${r.status}">${r.status}</span>`;

      // 4. Date
      const dateTd = document.createElement('td');
      dateTd.textContent = new Date(r.created_at).toLocaleDateString();

      // 5. Description Column (Clickable to view message & evidence URL)
      const descTd = document.createElement('td');
      const viewBtn = document.createElement('button');
      viewBtn.className = 'view-btn';
      viewBtn.innerHTML = `📄 View Message & URL`;
      viewBtn.onclick = () => showDetailsModal(r.id);
      descTd.appendChild(viewBtn);

      // 6. Actions (Update status)
      const actionTd = document.createElement('td');
      const updateBtn = document.createElement('button');
      updateBtn.className = 'action-btn';
      updateBtn.textContent = 'Update Status';
      updateBtn.onclick = () => openUpdateModal(r.id, r.status);
      actionTd.appendChild(updateBtn);

      tr.append(caseCodeTd, categoryTd, statusTd, dateTd, descTd, actionTd);
      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error('Error loading reports:', error);
  }
}

// Show Details Modal
function showDetailsModal(reportId) {
  const r = currentReports.find(item => item.id === reportId);
  if (!r) return;

  document.getElementById('details-case-code').textContent = r.case_code;
  document.getElementById('details-category').textContent = r.category;
  document.getElementById('details-status').innerHTML = `<span class="badge badge-${r.status}">${r.status}</span>`;
  document.getElementById('details-date').textContent = new Date(r.created_at).toLocaleString();
  document.getElementById('details-description').textContent = r.description || 'No description provided.';

  const urlContainer = document.getElementById('details-url');
  urlContainer.innerHTML = '';
  if (r.evidence_url && r.evidence_url.trim()) {
    const a = document.createElement('a');
    a.href = r.evidence_url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.color = '#FF87AB';
    a.style.fontWeight = 'bold';
    a.style.textDecoration = 'underline';
    a.textContent = r.evidence_url;
    urlContainer.appendChild(a);
  } else {
    urlContainer.innerHTML = '<span style="color:#777; font-style:italic;">No evidence URL was attached to this report.</span>';
  }

  document.getElementById('details-modal').style.display = 'flex';
}

function closeDetailsModal() {
  document.getElementById('details-modal').style.display = 'none';
}

// Close modal when clicking outside of modal content
window.addEventListener('click', (e) => {
  const detailsModal = document.getElementById('details-modal');
  const updateModal = document.getElementById('modal');
  if (e.target === detailsModal) closeDetailsModal();
  if (e.target === updateModal) updateModal.style.display = 'none';
});

// Update Status Modal
function openUpdateModal(reportId, currentStatus) {
  document.getElementById('update-report-id').value = reportId;
  document.getElementById('update-status').value = currentStatus === 'SUBMITTED' ? 'UNDER_REVIEW' : currentStatus;
  document.getElementById('update-note').value = '';
  document.getElementById('modal').style.display = 'flex';
}

document.getElementById('update-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('update-report-id').value;
  const status = document.getElementById('update-status').value;
  const note = document.getElementById('update-note').value;

  try {
    const res = await fetch(`${API_BASE}/reports/moderator/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ status, note })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }

    document.getElementById('modal').style.display = 'none';
    await loadReports(); // Instantly refresh table with new status

  } catch (error) {
    alert('Update failed: ' + error.message);
  }
});
