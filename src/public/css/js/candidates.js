let currentPage = 1;
const limit = 5;

async function loadCandidates() {
  const search = document.getElementById('searchInput').value;
  const status = document.getElementById('statusFilter').value;

  const res = await fetch(
    `/resumes?page=${currentPage}&limit=${limit}&search=${search}&status=${status}`
  );

  const result = await res.json();

  const table = document.getElementById('candidateTable');
  table.innerHTML = '';

  result.data.forEach(r => {
    table.innerHTML += `
      <tr>
        <td>${r.id}</td>
        <td>${r.name}</td>
        <td>${r.email}</td>
        <td>
          <span class="badge ${r.status === 'processed' ? 'bg-success' : 'bg-warning'}">
            ${r.status}
          </span>
        </td>
        <td>${new Date(r.createdAt).toLocaleString()}</td>
      </tr>
    `;
  });

  document.getElementById('pageInfo').innerText =
    `Page ${result.page} of ${result.pages}`;
}

function nextPage() {
  currentPage++;
  loadCandidates();
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadCandidates();
  }
}

loadCandidates();