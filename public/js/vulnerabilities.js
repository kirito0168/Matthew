// Vulnerabilities page functionality - Complete with Reports Display and Resolution
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
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    listDiv.innerHTML = vulnerabilities.map(vuln => {
        const canResolve = vuln.status === 'open' || vuln.status === 'in_progress';
        const isReporter = vuln.reporter_id === currentUser.id;
        
        return `
            <div class="vuln-card">
                <div class="vuln-header">
                    <div class="vuln-title-row">
                        <span class="vuln-id">ID: #${vuln.id}</span>
                        <h3 class="vuln-title">${escapeHtml(vuln.title)}</h3>
                    </div>
                    <div class="vuln-meta">
                        <span class="vuln-severity severity-${vuln.severity}">${vuln.severity.toUpperCase()}</span>
                        <span class="vuln-status status-${vuln.status}">${formatStatus(vuln.status)}</span>
                        <span class="vuln-exp">+${vuln.exp_reward} EXP</span>
                    </div>
                </div>
                <div class="vuln-body">
                    <p class="vuln-description">${escapeHtml(vuln.description).substring(0, 200)}${vuln.description.length > 200 ? '...' : ''}</p>
                    <div class="vuln-info">
                        <span><i class="icon-user"></i> Reported by: ${vuln.reporter_name || 'Unknown'}</span>
                        ${vuln.resolver_name ? `<span><i class="icon-check"></i> Resolved by: ${vuln.resolver_name}</span>` : ''}
                        <span><i class="icon-clock"></i> ${formatDate(vuln.created_at)}</span>
                    </div>
                    
                    ${vuln.reports && vuln.reports.length > 0 ? `
                        <div class="vuln-reports">
                            <h4>Recent Reports (${vuln.total_reports || vuln.reports.length})</h4>
                            <div class="reports-preview">
                                ${vuln.reports.slice(0, 3).map(report => `
                                    <div class="report-preview-item">
                                        <span class="report-author">${report.username}</span>
                                        <span class="report-date">${formatDate(report.created_at)}</span>
                                        ${report.report_summary ? `
                                            <p class="report-preview-text">${escapeHtml(report.report_summary).substring(0, 100)}...</p>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="vuln-actions">
                    <button class="btn-action" onclick="viewDetails(${vuln.id})">
                        <i class="icon-eye"></i> View Details
                    </button>
                    ${canResolve && !isReporter ? 
                        `<button class="btn-action btn-resolve" onclick="resolveVulnerability(${vuln.id})">
                            <i class="icon-check"></i> Resolve (+${vuln.exp_reward} EXP)
                        </button>` : 
                        ''}
                    <button class="btn-action btn-report" onclick="window.location.href='/reports.html#vuln-${vuln.id}'">
                        <i class="icon-document"></i> View Reports
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Details modal functions
async function viewDetails(id) {
    const modal = document.getElementById('detailsModal');
    const detailsDiv = document.getElementById('vulnerabilityDetails');
    
    modal.style.display = 'block';
    detailsDiv.innerHTML = '<div class="loading-spinner"></div>';

    try {
        // Fetch vulnerability details
        const vulnResponse = await fetch(`${API_URL}/vulnerabilities/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });

        const vulnData = await vulnResponse.json();

        // Fetch reports for this vulnerability
        const reportsResponse = await fetch(`${API_URL}/reports?vulnerability_id=${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });

        const reportsData = await reportsResponse.json();

        if (vulnResponse.ok && vulnData.vulnerability) {
            displayVulnerabilityDetails(vulnData.vulnerability, reportsData.reports || []);
        } else {
            detailsDiv.innerHTML = '<div class="error">Failed to load details</div>';
        }
    } catch (error) {
        console.error('Error loading details:', error);
        detailsDiv.innerHTML = '<div class="error">Failed to load details</div>';
    }
}

function displayVulnerabilityDetails(vuln, reports) {
    const detailsDiv = document.getElementById('vulnerabilityDetails');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const canResolve = (vuln.status === 'open' || vuln.status === 'in_progress') && vuln.reporter_id !== currentUser.id;
    
    detailsDiv.innerHTML = `
        <div class="detail-section">
            <h3>Vulnerability Information</h3>
            <div class="detail-id">Vulnerability ID: #${vuln.id}</div>
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
        
        ${reports.length > 0 ? `
            <div class="detail-section">
                <h3>Reports for this Vulnerability (${reports.length})</h3>
                <div class="reports-list">
                    ${reports.map(report => `
                        <div class="report-item">
                            <div class="report-header">
                                <span class="report-author">${report.username}</span>
                                <span class="report-date">${formatDate(report.created_at)}</span>
                            </div>
                            ${report.report_summary ? `
                                <div class="report-content">
                                    <p>${escapeHtml(report.report_summary)}</p>
                                </div>
                            ` : ''}
                            <div class="report-actions">
                                <a href="/reports.html#report-${report.id}" class="btn-link">View Full Report</a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : `
            <div class="detail-section">
                <h3>Reports</h3>
                <p class="no-reports">No reports have been submitted for this vulnerability yet.</p>
                <button class="btn-primary" onclick="window.location.href='/reports.html'">
                    Create Report
                </button>
            </div>
        `}
        
        <div class="detail-actions">
            ${canResolve ? `
                <button class="btn-primary" onclick="resolveVulnerability(${vuln.id})">
                    <i class="icon-check"></i> Resolve This Vulnerability (+${vuln.exp_reward} EXP)
                </button>
            ` : ''}
            <button class="btn-secondary" onclick="window.location.href='/reports.html'">
                <i class="icon-document"></i> Create Report
            </button>
            <button class="btn-secondary" onclick="closeDetailsModal()">Close</button>
        </div>
    `;
}

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

async function resolveVulnerability(id) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id) {
        showNotification('Please login to resolve vulnerabilities', 'error');
        return;
    }

    if (!confirm('Are you sure you want to resolve this vulnerability? You will earn EXP rewards.')) return;

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
            showNotification('Vulnerability resolved successfully! EXP gained!', 'success');
            
            // Show EXP animation
            showExpAnimation('+EXP');
            
            closeDetailsModal();
            loadVulnerabilities();
            
            // Update user data to reflect new EXP
            const userResponse = await fetch(`${API_URL}/users/${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                localStorage.setItem('user', JSON.stringify(userData.user));
                updateNavigation(); // Update navigation to show new level/exp
            }
        } else {
            showNotification(data.message || 'Failed to resolve vulnerability', 'error');
        }
    } catch (error) {
        console.error('Resolve error:', error);
        showNotification('Failed to resolve vulnerability', 'error');
    }
}

// Report modal functions for creating new vulnerabilities
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

// Pagination functions
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

// Utility functions
function formatStatus(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMins = Math.floor(diffTime / (1000 * 60));
            return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
        }
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 30) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function showExpAnimation(exp) {
    const expAnimation = document.createElement('div');
    expAnimation.className = 'exp-animation';
    expAnimation.textContent = exp;
    document.body.appendChild(expAnimation);

    setTimeout(() => {
        expAnimation.classList.add('animate');
    }, 100);

    setTimeout(() => {
        document.body.removeChild(expAnimation);
    }, 2000);
}

// Inject additional styles
function injectVulnerabilitiesStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Vulnerability ID styles */
        .vuln-id {
            background: rgba(0, 212, 255, 0.1);
            color: var(--primary-color);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.9rem;
            margin-right: 1rem;
        }

        .vuln-title-row {
            display: flex;
            align-items: center;
            margin-bottom: 0.5rem;
        }

        .detail-id {
            background: rgba(0, 212, 255, 0.1);
            color: var(--primary-color);
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-weight: bold;
            margin-bottom: 1rem;
            display: inline-block;
        }

        /* Reports preview styles */
        .vuln-reports {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid rgba(0, 212, 255, 0.1);
        }

        .vuln-reports h4 {
            color: var(--primary-color);
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
        }

        .reports-preview {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .report-preview-item {
            background: rgba(0, 0, 0, 0.3);
            padding: 0.5rem;
            border-radius: 4px;
            font-size: 0.85rem;
        }

        .report-author {
            color: var(--primary-color);
            font-weight: bold;
            margin-right: 1rem;
        }

        .report-date {
            color: var(--text-secondary);
            font-size: 0.8rem;
        }

        .report-preview-text {
            color: var(--text-secondary);
            margin-top: 0.25rem;
            font-size: 0.85rem;
        }

        /* Button styles */
        .btn-report {
            background: rgba(156, 39, 176, 0.2);
            border-color: #9C27B0;
            color: #9C27B0;
        }

        .btn-report:hover {
            background: #9C27B0;
            color: white;
        }

        .btn-resolve {
            border-color: #4CAF50;
            color: #4CAF50;
        }

        .btn-resolve:hover {
            background: #4CAF50;
            color: white;
        }

        /* Vulnerability card styles */
        .vuln-card {
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 8px;
            padding: 1.5rem;
            transition: all 0.3s ease;
            margin-bottom: 1rem;
        }

        .vuln-card:hover {
            border-color: var(--primary-color);
            box-shadow: 0 10px 30px rgba(0, 212, 255, 0.2);
            transform: translateY(-2px);
        }

        .vuln-header {
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
            margin-top: 0.5rem;
        }

        .vuln-severity,
        .vuln-status,
        .vuln-exp {
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: bold;
        }

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

        .status-open {
            background: rgba(0, 212, 255, 0.2);
            color: var(--primary-color);
        }

        .status-in_progress {
            background: rgba(255, 152, 0, 0.2);
            color: #FF9800;
        }

        .status-resolved {
            background: rgba(76, 175, 80, 0.2);
            color: #4CAF50;
        }

        .status-closed {
            background: rgba(128, 128, 128, 0.2);
            color: #808080;
        }

        .vuln-exp {
            background: rgba(255, 215, 0, 0.2);
            color: #FFD700;
        }

        .vuln-body {
            margin-bottom: 1rem;
        }

        .vuln-description {
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 1rem;
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

        /* Reports list in details */
        .reports-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            max-height: 400px;
            overflow-y: auto;
        }

        .report-item {
            background: rgba(0, 0, 0, 0.5);
            padding: 1rem;
            border-radius: 4px;
            border: 1px solid rgba(0, 212, 255, 0.1);
        }

        .report-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
        }

        .report-content {
            color: var(--text-secondary);
            margin: 0.5rem 0;
        }

        .btn-link {
            color: var(--primary-color);
            text-decoration: none;
            font-size: 0.9rem;
        }

        .btn-link:hover {
            text-decoration: underline;
        }

        /* EXP Animation */
        .exp-animation {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 3rem;
            font-weight: bold;
            color: #FFD700;
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
            opacity: 0;
            pointer-events: none;
            z-index: 10000;
        }

        .exp-animation.animate {
            animation: expGain 2s ease-out;
        }

        @keyframes expGain {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -60%) scale(1.5);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -70%) scale(1);
            }
        }

        /* Notification styles */
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid rgba(0, 212, 255, 0.3);
            color: var(--text-primary);
            max-width: 400px;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            z-index: 10000;
        }

        .notification.show {
            transform: translateX(0);
        }

        .notification-success {
            border-color: #4CAF50;
            background: rgba(76, 175, 80, 0.1);
        }

        .notification-error {
            border-color: #F44336;
            background: rgba(244, 67, 54, 0.1);
        }

        /* Loading spinner */
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(0, 212, 255, 0.3);
            border-radius: 50%;
            border-top-color: var(--primary-color);
            animation: spin 1s ease-in-out infinite;
            margin: 2rem auto;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .no-data {
            text-align: center;
            color: var(--text-secondary);
            padding: 3rem;
            font-size: 1.1rem;
        }

        .error {
            color: #F44336;
            text-align: center;
            padding: 2rem;
        }

        .no-reports {
            color: var(--text-secondary);
            padding: 1rem;
            text-align: center;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .vuln-title-row {
                flex-direction: column;
                align-items: flex-start;
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