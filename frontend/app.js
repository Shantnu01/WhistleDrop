const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'
  : 'https://whistledrop-api.onrender.com/api';

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Simple slide navigation
function showSlide(slideId) {
  document.querySelectorAll('.slide').forEach(slide => {
    slide.style.display = 'none';
  });
  document.getElementById(slideId).style.display = 'flex';
}

document.getElementById('btn-show-submit').addEventListener('click', () => showSlide('submit-slide'));
document.getElementById('btn-show-track').addEventListener('click', () => showSlide('track-slide'));

// Handle Submit Report
document.getElementById('submit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Submitting...';

  const category = document.getElementById('category').value;
  const description = document.getElementById('description').value;
  const evidenceUrl = document.getElementById('evidenceUrl').value;

  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, description, evidenceUrl })
    });

    const data = await res.json();

    if (!res.ok) {
      let errorMsg = data.message || 'Validation error';
      if (data.errors && data.errors.length > 0) {
        errorMsg += ':\n' + data.errors.map(e => `- ${e.field.replace('body.', '')}: ${e.message}`).join('\n');
      }
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    // Show positive pop-out (toast)
    showToast('Success! Your anonymous report was safely delivered.');

    // Hide form, show result
    document.getElementById('submit-form').style.display = 'none';
    document.getElementById('submit-result').style.display = 'block';
    document.getElementById('generated-case-code').innerText = data.caseCode;

  } catch (error) {
    console.error(error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Submit Anonymously';
  }
});

// Handle Track Report
document.getElementById('track-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const trackBtn = e.target.querySelector('button[type="submit"]');
  trackBtn.disabled = true;
  trackBtn.innerText = 'Checking...';

  const caseCode = document.getElementById('caseCode').value;

  try {
    const res = await fetch(`${API_BASE}/reports/${caseCode}`);
    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'Report not found');
      throw new Error(data.message);
    }

    // Populate data
    document.getElementById('status-badge').innerText = data.status;
    document.getElementById('track-category').innerText = data.category;
    document.getElementById('track-date').innerText = new Date(data.createdAt).toLocaleDateString();

    const updatesContainer = document.getElementById('updates-container');
    updatesContainer.innerHTML = '';

    if (data.updates && data.updates.length > 0) {
      data.updates.forEach(update => {
        const item = document.createElement('div');
        item.className = 'update-item';
        item.innerHTML = `
          <div class="update-date">${new Date(update.createdAt).toLocaleString()} - <strong>${update.status}</strong></div>
          <div class="update-note">${update.note}</div>
        `;
        updatesContainer.appendChild(item);
      });
    } else {
      updatesContainer.innerHTML = '<p>No updates from moderators yet.</p>';
    }

    // Show result
    document.getElementById('track-result').style.display = 'block';

  } catch (error) {
    console.error(error);
  } finally {
    trackBtn.disabled = false;
    trackBtn.innerText = 'Check Status';
  }
});
