async function loadDashboard() {
  try {
    const res = await fetch('/resumes');
    const data = await res.json();

    const total = data.length;
    const processed = data.filter(r => r.status === 'processed').length;
    const pending = data.filter(r => r.status === 'pending').length;

    document.getElementById('totalResumes').innerText = total;
    document.getElementById('processedResumes').innerText = processed;
    document.getElementById('pendingResumes').innerText = pending;

    const table = document.getElementById('candidateTable');
    table.innerHTML = '';
    data.slice(0, 10).forEach(r => {
      table.innerHTML += `
        <tr>
          <td>${r.id}</td>
          <td>${r.name}</td>
          <td>${r.email}</td>
          <td>${r.status}</td>
          <td>${new Date(r.createdAt).toLocaleString()}</td>
        </tr>
      `;
    });

  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

loadDashboard();