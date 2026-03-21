const API_BASE = "http://localhost:8000";
const WS_BASE  = "ws://localhost:8000";

let socket;

function connectWebSocket() {
  socket = new WebSocket(`${WS_BASE}/ws/dashboard`);

  socket.onopen = () => {
    console.log('[WS] Connected');
    document.getElementById('wsStatus').innerText = 'Live';
    document.getElementById('wsStatus').className = 'ws-status connected';

    setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send('ping');
      }
    }, 30000);
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'full_queue' || data.type === 'queue_update') {
      renderQueue(data.patients);
    }
  };

  socket.onclose = () => {
    console.log('[WS] Disconnected — reconnecting in 3s...');
    document.getElementById('wsStatus').innerText = 'Reconnecting...';
    document.getElementById('wsStatus').className = 'ws-status disconnected';
    setTimeout(connectWebSocket, 3000);
  };

  socket.onerror = (err) => {
    console.error('[WS] Error:', err);
  };
}

function renderQueue(patients) {
  const tbody = document.getElementById('queueBody');
  tbody.innerHTML = '';

  if (!patients || patients.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="empty-queue">No patients in queue</td></tr>';
    return;
  }

  for (const p of patients) {
    const score      = parseInt(p.data.risk_score || 0);
    const colorClass = score >= 80 ? 'critical' : score >= 50 ? 'urgent' : 'stable';

    let abnormalsHtml = '';
    const ab = p.data.abnormalities;
    if (Array.isArray(ab) && ab.length > 0) {
      abnormalsHtml = '<ul>' + ab.map(a => `<li>${a}</li>`).join('') + '</ul>';
    } else {
      abnormalsHtml = '<span class="none-flagged">None flagged</span>';
    }

    tbody.innerHTML += `
      <tr>
        <td class="token-cell">${p.token}</td>
        <td class="risk-cell ${colorClass}">${score}</td>
        <td class="abnormal-cell">${abnormalsHtml}</td>
        <td class="summary-cell">${p.data.summary || ''}</td>
        <td class="action-cell">
          <button class="btn-fhir" onclick="viewFhir('${p.token}')">
            View FHIR
          </button>
        </td>
      </tr>`;
  }

  document.getElementById('lastUpdated').innerText =
    'Last updated: ' + new Date().toLocaleTimeString();
}

async function viewFhir(token) {
  try {
    const res  = await fetch(`${API_BASE}/api/records/${token}`);
    const data = await res.json();

    if (data.status === 'expired') {
      alert('Access denied: 2-hour consent window expired. Data deleted.');
    } else if (data.status === 'available') {
      const mins    = Math.floor((data.expires_in_seconds || 0) / 60);
      const warning = data.warning === 'EXPIRING_SOON'
        ? `\n\nWARNING: Records expire in ${mins} minutes.` : '';
      alert('FHIR Records:\n\n' +
            JSON.stringify(data.data, null, 2) + warning);
    } else {
      alert('No past records were linked by this patient.');
    }
  } catch {
    alert('Failed to retrieve records. Is the backend running?');
  }
}

connectWebSocket();