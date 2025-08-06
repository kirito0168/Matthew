// Vulnerabilities page functionality
let currentPage = 1;
let currentTab = 'all';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadVulnerabilities();
    setupEventListeners();
    injectVulnerabilitiesStyles();
});

function setupEventListeners() {
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }

    // Close modal on outside click
    window.onclick = function(event) {
        const reportModal = document.getElementById('reportModal');
        const detailsModal = document.getElementById('detailsModal');
        if (event.target === reportModal) {
            closeReportModal();
        }
        if (event.target === detailsModal) {
            closeDetailsModal();
        }
    }
}

async function loadVulnerabilities() {
    const listDiv = document.getElementById('vulnerabilitiesList');
    listDiv.innerHTML = '<div class="loading-spinner"></div>';

    try {
        let url = `${API_URL}/vulnerabilities?page=${currentPage}&limit=10`;
        
        // Add filters
        const severityFilter = document.getElementById('severityFilter')?.value;
        const statusFilter = document.getElementById('statusFilter')?.value;
        
        if (severityFilter) url += `&severity=${severityFilter}`;
        if (statusFilter) url += `&status=${statusFilter}`;

        // Add tab filter
        if (currentTab === 'my-reports' || currentTab === 'my-resolved') {
            const token = localStorage.getItem('token');
            if (!token) {
                listDiv.innerHTML = '<div class="no-data">Please login to view your reports</div>';
                return;
            }
            url += `&tab=${currentTab}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });

        const data = await response.json();

        if (response.ok && data.vulnerabilities && data.vulnerabilities.length > 0) {
            displayVulnerabilities(data.vulnerabilities);
            displayPagination(data.pagination);
        } else {
            listDiv.innerHTML = '<div class="no-data">No vulnerabilities found</div>';
            document.getElementById('pagination').innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading vulnerabilities:', error);
        listDiv.innerHTML = '<div class="error">Failed to load vulnerabilities</div>';
    }
}

function displayVulnerabilities(vulnerabilities) {
    const listDiv = document.getElementById('vulnerabilitiesList');
    listDiv.innerHTML = vulnerabilities.map(vuln => `
        <div class="vuln-card">
            <div class="vuln-header">
                <h3 class="vuln-title">${escapeHtml(vuln.title)}</h3>
                <div class="vuln-meta">
                    <span class="vuln-severity severity-${vuln.severity}">${vuln.severity.toUpperCase()}</span>
                    <span class="vuln-status status-${vuln.status}">${formatStatus(vuln.status)}</span>
                    <span class="vuln-exp">+${vuln.exp_reward} EXP</span>
                </div>
            </div>
            <div class="vuln-body">
                <p class="vuln-description">${escapeHtml(vuln.description).substring(0, 200)}${vuln.description.length > 200 ? '...' : ''}</p>
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
            showNotification('Vulnerability reported successfully!', 'success');
            closeReportModal();
            loadVulnerabilities();
        } else {
            showNotification(data.message || 'Failed to report vulnerability', 'error');
        }
    } catch (error) {
        console.error('Report error:', error);
        showNotification('Failed to submit report', 'error');
    }
}

// Details modal functions
async function viewDetails(id) {
    const modal = document.getElementById('detailsModal');
    const detailsDiv = document.getElementById('vulnerabilityDetails');
    
    modal.style.display = 'block';
    detailsDiv.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch(`${API_URL}/vulnerabilities/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });

        const data = await response.json();

        if (response.ok && data.vulnerability) {
            displayVulnerabilityDetails(data.vulnerability);
        } else {
            detailsDiv.innerHTML = '<div class="error">Failed to load details</div>';
        }
    } catch (error) {
        console.error('Error loading details:', error);
        detailsDiv.innerHTML = '<div class="error">Failed to load details</div>';
    }
}

function displayVulnerabilityDetails(vuln) {
    const detailsDiv = document.getElementById('vulnerabilityDetails');
    detailsDiv.innerHTML = `
        <div class="detail-section">
            <h3>Vulnerability Information</h3>
            <div class="detail-meta">
                <span class="vuln-severity severity-${vuln.severity}">${vuln.severity.toUpperCase()}</span>
                <span class="vuln-status status-${vuln.status}">${formatStatus(vuln.status)}</span>
                <span class="vuln-exp">+${vuln.exp_reward} EXP</span>
            </div>
            <div class="detail-info">
                <p><strong>Title:</strong> ${escapeHtml(vuln.title)}</p>
                <p><strong>Description:</strong> ${escapeHtml(vuln.description)}</p>
                <p><strong>Reported by:</strong> ${vuln.reporter_name || 'Unknown'}</p>
                <p><strong>Reported on:</strong> ${formatDate(vuln.created_at)}</p>
                ${vuln.resolver_name ? `<p><strong>Resolved by:</strong> ${vuln.resolver_name}</p>` : ''}
                ${vuln.resolved_at ? `<p><strong>Resolved on:</strong> ${formatDate(vuln.resolved_at)}</p>` : ''}
            </div>
        </div>
        ${vuln.status === 'open' || vuln.status === 'in_progress' ? `
            <div class="detail-actions">
                <button class="btn-primary" onclick="resolveVulnerability(${vuln.id})">Resolve This Vulnerability</button>
            </div>
        ` : ''}
    `;
}

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

async function resolveVulnerability(id) {
    if (!confirm('Are you sure you want to resolve this vulnerability?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/vulnerabilities/${id}/resolve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Vulnerability resolved successfully!', 'success');
            closeDetailsModal();
            loadVulnerabilities();
        } else {
            showNotification(data.message || 'Failed to resolve vulnerability', 'error');
        }
    } catch (error) {
        console.error('Resolve error:', error);
        showNotification('Failed to resolve vulnerability', 'error');
    }
}

// Helper functions
function formatStatus(status) {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} show`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Inject CSS styles for vulnerabilities page
function injectVulnerabilitiesStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Vulnerabilities Page Specific Styles */
        .vulnerabilities-container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 2rem;
            min-height: calc(100vh - 100px);
        }

        .vulnerabilities-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            animation: fadeInUp 0.5s ease-out;
        }

        .page-title {
            font-size: 2.5rem;
            color: var(--primary-color);
            text-shadow: 0 0 20px var(--primary-color);
        }

        .filters-section {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            animation: fadeInUp 0.5s ease-out 0.2s backwards;
        }

        .filter-select {
            padding: 0.75rem 1rem;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .filter-select:hover,
        .filter-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
        }

        .vulnerabilities-tabs {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            border-bottom: 2px solid rgba(0, 212, 255, 0.1);
            animation: fadeInUp 0.5s ease-out 0.3s backwards;
        }

        .tab-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            padding: 1rem 2rem;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            font-size: 1rem;
        }

        .tab-btn:hover {
            color: var(--primary-color);
        }

        .tab-btn.active {
            color: var(--primary-color);
        }

        .tab-btn.active::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            right: 0;
            height: 2px;
            background: var(--primary-color);
        }

        .vulnerabilities-list {
            animation: fadeInUp 0.5s ease-out 0.4s backwards;
            min-height: 400px;
        }

        .vuln-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            transition: all 0.3s ease;
            animation: fadeInUp 0.5s ease-out;
        }

        .vuln-card:hover {
            border-color: var(--primary-color);
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
            margin: 0;
        }

        .vuln-meta {
            display: flex;
            gap: 1rem;
            align-items: center;
        }

        .vuln-severity {
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: bold;
            text-transform: uppercase;
        }

        .vuln-status {
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: bold;
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

        /* Status colors */
        .status-open { 
            background: rgba(0, 212, 255, 0.2);
            color: var(--primary-color); 
        }
        
        .status-in_progress { 
            background: rgba(255, 152, 0, 0.2);
            color: var(--warning); 
        }
        
        .status-resolved { 
            background: rgba(76, 175, 80, 0.2);
            color: var(--success); 
        }
        
        .status-closed { 
            background: rgba(128, 128, 128, 0.2);
            color: var(--text-secondary); 
        }

        /* Severity colors */
        .severity-low { 
            background: rgba(76, 175, 80, 0.2);
            color: #4CAF50; 
        }
        
        .severity-medium { 
            background: rgba(255, 152, 0, 0.2);
            color: #FF9800; 
        }
        
        .severity-high { 
            background: rgba(244, 67, 54, 0.2);
            color: #F44336; 
        }
        
        .severity-critical { 
            background: rgba(156, 39, 176, 0.2);
            color: #9C27B0; 
        }

        /* Modal styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
        }

        .modal-content {
            background: var(--card-bg);
            margin: 5% auto;
            padding: 2rem;
            border: 1px solid var(--border-color);
            border-radius: 10px;
            width: 90%;
            max-width: 600px;
            position: relative;
            animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
            from {
                transform: translateY(-50px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .modal-close {
            color: var(--text-secondary);
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            transition: color 0.3s ease;
        }

        .modal-close:hover {
            color: var(--primary-color);
        }

        .modal-title {
            color: var(--primary-color);
            margin-bottom: 1.5rem;
            font-size: 1.8rem;
        }

        /* Form styles */
        .report-form {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .form-label {
            color: var(--text-primary);
            font-weight: 500;
        }

        .form-input {
            padding: 0.75rem;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            border-radius: 4px;
            transition: all 0.3s ease;
        }

        .form-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
        }

        .form-input::placeholder {
            color: var(--text-secondary);
        }

        textarea.form-input {
            resize: vertical;
            min-height: 100px;
        }

        .form-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 1rem;
        }

        /* Details styles */
        .vulnerability-details {
            padding: 1rem;
        }

        .detail-section {
            margin-bottom: 1.5rem;
        }

        .detail-section h3 {
            color: var(--primary-color);
            margin-bottom: 1rem;
            border-bottom: 1px solid rgba(0, 212, 255, 0.2);
            padding-bottom: 0.5rem;
        }

        .detail-meta {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .detail-info {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .detail-info p {
            margin: 0;
            color: var(--text-secondary);
        }

        .detail-info strong {
            color: var(--text-primary);
            margin-right: 0.5rem;
        }

        .detail-actions {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(0, 212, 255, 0.2);
        }

        /* Pagination styles */
        .pagination {
            margin-top: 2rem;
        }

        .pagination-controls {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
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
            border-color: var(--primary-color);
        }

        .page-current {
            padding: 0.5rem 1rem;
            background: var(--primary-color);
            color: var(--dark-bg);
            border-radius: 4px;
            font-weight: bold;
        }

        /* Utility styles */
        .no-data {
            text-align: center;
            color: var(--text-secondary);
            padding: 3rem;
            font-size: 1.1rem;
        }

        .error {
            text-align: center;
            color: var(--danger);
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

        /* Responsive Design */
        @media (max-width: 768px) {
            .vulnerabilities-header {
                flex-direction: column;
                gap: 1rem;
                align-items: stretch;
            }

            .filters-section {
                flex-direction: column;
            }

            .vuln-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }

            .vuln-meta {
                flex-wrap: wrap;
            }

            .vuln-info {
                flex-direction: column;
                gap: 0.5rem;
            }

            .vuln-actions {
                flex-direction: column;
            }

            .modal-content {
                width: 95%;
                margin: 10% auto;
            }
        }
    `;
    document.head.appendChild(style);
}

// Export functions to global scope
window.switchVulnTab = switchVulnTab;
window.changePage = changePage;
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.viewDetails = viewDetails;
window.closeDetailsModal = closeDetailsModal;
window.resolveVulnerability = resolveVulnerability;