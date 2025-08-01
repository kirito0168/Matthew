// Vulnerabilities JavaScript

let currentTab = 'all';
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', async () => {
    // Require authentication
    const user = await requireAuth();
    if (!user) return;

    // Load vulnerabilities
    await loadVulnerabilities();

    // Setup form handler
    document.getElementById('reportForm').addEventListener('submit', handleReportSubmit);
});

async function loadVulnerabilities() {
    const vulnerabilitiesList = document.getElementById('vulnerabilitiesList');
    vulnerabilitiesList.innerHTML = '<div class="loading-spinner"></div>';

    try {
        let url = `${API_URL}/vulnerabilities?page=${currentPage}&limit=${itemsPerPage}`;
        
        // Add filters
        const severity = document.getElementById('severityFilter').value;
        const status = document.getElementById('statusFilter').value;
        
        if (severity) url += `&severity=${severity}`;
        if (status) url += `&status=${status}`;

        // Handle different tabs
        if (currentTab === 'my-reports' || currentTab === 'my-resolved') {
            const response = await fetch(`${API_URL}/vulnerabilities/user`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                let vulnerabilities = currentTab === 'my-reports' ? 
                    data.reported : data.resolved;
                
                // Apply filters
                if (severity) {
                    vulnerabilities = vulnerabilities.filter(v => v.severity === severity);
                }
                if (status) {
                    vulnerabilities = vulnerabilities.filter(v => v.status === status);
                }

                displayVulnerabilities(vulnerabilities);
                // No pagination for user vulnerabilities
                document.getElementById('pagination').innerHTML = '';
            }
        } else {
            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                displayVulnerabilities(data.vulnerabilities);
                displayPagination(data.pagination);
            }
        }
    } catch (error) {
        console.error('Error loading vulnerabilities:', error);
        vulnerabilitiesList.innerHTML = '<p class="error">Error loading vulnerabilities</p>';
    }
}

function displayVulnerabilities(vulnerabilities) {
    const vulnerabilitiesList = document.getElementById('vulnerabilitiesList');

    if (vulnerabilities.length === 0) {
        vulnerabilitiesList.innerHTML = '<p class="no-data">No vulnerabilities found</p>';
        return;
    }

    vulnerabilitiesList.innerHTML = vulnerabilities.map(vuln => `
        <div class="vulnerability-card">
            <div class="vuln-header">
                <h3 class="vuln-title">${vuln.title}</h3>
                <div class="vuln-meta">
                    <span class="vuln-severity severity-${vuln.severity}">${vuln.severity}</span>
                    <span class="vuln-status status-${vuln.status}">${vuln.status}</span>
                    <span class="vuln-exp">+${vuln.exp_reward} EXP</span>
                </div>
            </div>
            <div class="vuln-body">
                <p class="vuln-description">${vuln.description.substring(0, 200)}${vuln.description.length > 200 ? '...' : ''}</p>
                <div class="vuln-info">
                    <span>Reported by: ${vuln.reporter_name || 'Unknown'}</span>
                    ${vuln.resolver_name ? `<span>Resolved by: ${vuln.resolver_name}</span>` : ''}
                    <span>${formatDate(vuln.created_at)}</span>
                </div>
            </div>
            <div class="vuln-actions">
                <button class="btn-action" onclick="viewDetails(${vuln.id})">View Details</button>
                ${vuln.status === 'open' || vuln.status === 'in_progress' ? 
                    `<button class="btn-action btn-resolve" onclick="resolveVulnerability(${vuln.id})">Resolve</button>` : 
                    ''}
            </div>
        </div>
    `).join('');
}

function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    
    if (pagination.totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let html = '<div class="pagination-controls">';
    
    // Previous button
    if (pagination.page > 1) {
        html += `<button class="page-btn" onclick="changePage(${pagination.page - 1})">Previous</button>`;
    }

    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === pagination.page) {
            html += `<span class="page-current">${i}</span>`;
        } else {
            html += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
        }
    }

    // Next button
    if (pagination.page < pagination.totalPages) {
        html += `<button class="page-btn" onclick="changePage(${pagination.page + 1})">Next</button>`;
    }

    html += '</div>';
    paginationDiv.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadVulnerabilities();
}

function switchVulnTab(tab) {
    currentTab = tab;
    currentPage = 1;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadVulnerabilities();
}

// Report modal functions
function openReportModal() {
    document.getElementById('reportModal').style.display = 'block';
}

function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
    document.getElementById('reportForm').reset();
}

async function handleReportSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('bugTitle').value;
    const description = document.getElementById('bugDescription').value;
    const severity = document.getElementById('bugSeverity').value;

    try {
        const response = await fetch(`${API_URL}/vulnerabilities`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description, severity })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Vulnerability reported successfully! +25 EXP', 'success');
            closeReportModal();
            loadVulnerabilities();
            
            // Show exp gain animation if the function exists
            if (typeof showSkillActivation === 'function') {
                showSkillActivation();
            }
        } else {
            showNotification(data.message || 'Failed to report vulnerability', 'error');
        }
    } catch (error) {
        console.error('Error reporting vulnerability:', error);
        showNotification('Error reporting vulnerability', 'error');
    }
}

// View vulnerability details
async function viewDetails(id) {
    const modal = document.getElementById('detailsModal');
    const detailsDiv = document.getElementById('vulnerabilityDetails');
    
    modal.style.display = 'block';
    detailsDiv.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch(`${API_URL}/vulnerabilities/${id}`);
        const data = await response.json();

        if (response.ok) {
            const vuln = data.vulnerability;

            detailsDiv.innerHTML = `
                <div class="detail-section">
                    <h3>${vuln.title}</h3>
                    <div class="detail-meta">
                        <span class="vuln-severity severity-${vuln.severity}">${vuln.severity}</span>
                        <span class="vuln-status status-${vuln.status}">${vuln.status}</span>
                        <span class="vuln-exp">+${vuln.exp_reward} EXP</span>
                    </div>
                </div>
                <div class="detail-section">
                    <h4>Description</h4>
                    <p>${vuln.description}</p>
                </div>
                <div class="detail-section">
                    <h4>Details</h4>
                    <div class="detail-info">
                        <p><strong>Reported by:</strong> ${vuln.reporter_name || 'Unknown'}</p>
                        ${vuln.resolver_name ? `<p><strong>Resolved by:</strong> ${vuln.resolver_name}</p>` : ''}
                        <p><strong>Created:</strong> ${formatDate(vuln.created_at)}</p>
                        <p><strong>Updated:</strong> ${formatDate(vuln.updated_at)}</p>
                    </div>
                </div>
                ${vuln.status === 'open' || vuln.status === 'in_progress' ? 
                    `<div class="detail-actions">
                        <button class="btn-primary" onclick="resolveVulnerability(${vuln.id})">Resolve This Bug</button>
                    </div>` : 
                    ''}
            `;
        } else {
            detailsDiv.innerHTML = `<p class="error">${data.message || 'Error loading details'}</p>`;
        }
    } catch (error) {
        console.error('Error loading vulnerability details:', error);
        detailsDiv.innerHTML = '<p class="error">Error loading details</p>';
    }
}

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

// Resolve vulnerability
async function resolveVulnerability(id) {
    if (!confirm('Are you sure you want to mark this vulnerability as resolved?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/vulnerabilities/${id}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'resolved' })
        });

        const data = await response.json();

        if (response.ok) {
            // Get vulnerability details to show exp reward
            const vulnResponse = await fetch(`${API_URL}/vulnerabilities/${id}`);
            if (vulnResponse.ok) {
                const vulnData = await vulnResponse.json();
                const expReward = vulnData.vulnerability.exp_reward;
                
                showNotification(`Vulnerability resolved! +${expReward} EXP`, 'success');
                
                // Show quest complete animation if available
                if (typeof showQuestComplete === 'function') {
                    showQuestComplete(vulnData.vulnerability.title, expReward);
                }
            } else {
                showNotification('Vulnerability resolved successfully!', 'success');
            }
            
            closeDetailsModal();
            loadVulnerabilities();
        } else {
            showNotification(data.message || 'Failed to resolve vulnerability', 'error');
        }
    } catch (error) {
        console.error('Error resolving vulnerability:', error);
        showNotification('Error resolving vulnerability', 'error');
    }
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Add CSS styles
const style = document.createElement('style');
style.textContent = `
.vulnerabilities-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

.vulnerabilities-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.filters-section {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
}

.filter-select {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}

.vulnerabilities-tabs {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
}

.vulnerability-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    transition: all 0.3s ease;
    animation: fadeInUp 0.5s ease-out;
}

.vulnerability-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 212, 255, 0.2);
}

.vuln-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.vuln-title {
    color: var(--primary-color);
    font-size: 1.3rem;
}

.vuln-meta {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.vuln-exp {
    color: var(--accent-color);
    font-weight: bold;
}

.vuln-body {
    margin-bottom: 1rem;
}

.vuln-description {
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    line-height: 1.6;
}

.vuln-info {
    display: flex;
    gap: 2rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.vuln-actions {
    display: flex;
    gap: 1rem;
}

.btn-action {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--primary-color);
    color: var(--primary-color);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-action:hover {
    background: var(--primary-color);
    color: var(--dark-bg);
}

.btn-resolve {
    border-color: var(--success);
    color: var(--success);
}

.btn-resolve:hover {
    background: var(--success);
    color: var(--dark-bg);
}

.status-open { color: var(--primary-color); }
.status-in_progress { color: var(--warning); }
.status-resolved { color: var(--success); }
.status-closed { color: var(--text-secondary); }

.severity-low { color: #4CAF50; }
.severity-medium { color: #FF9800; }
.severity-high { color: #F44336; }
.severity-critical { color: #9C27B0; }

.report-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.detail-section {
    margin-bottom: 1.5rem;
}

.detail-meta {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
}

.detail-info p {
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
}

.detail-info strong {
    color: var(--text-primary);
}

.detail-actions {
    margin-top: 2rem;
}

.pagination-controls {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 2rem;
}

.page-btn {
    padding: 0.5rem 1rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.page-btn:hover {
    background: var(--primary-color);
    color: var(--dark-bg);
}

.page-current {
    padding: 0.5rem 1rem;
    background: var(--primary-color);
    color: var(--dark-bg);
    border-radius: 4px;
    font-weight: bold;
}

.no-data {
    text-align: center;
    color: var(--text-secondary);
    padding: 3rem;
    font-size: 1.1rem;
}

.error {
    text-align: center;
    color: var(--error);
    padding: 2rem;
}

.loading-spinner {
    text-align: center;
    padding: 3rem;
}

.loading-spinner::after {
    content: '⚔️';
    display: inline-block;
    animation: spin 1s linear infinite;
    font-size: 2rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);

// Export functions to global scope
window.switchVulnTab = switchVulnTab;
window.changePage = changePage;
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.viewDetails = viewDetails;
window.closeDetailsModal = closeDetailsModal;
window.resolveVulnerability = resolveVulnerability;