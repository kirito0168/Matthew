
// Reports JavaScript

let currentTab = 'all';
let currentPage = 1;
const itemsPerPage = 10;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Require authentication
    currentUser = await requireAuth();
    if (!currentUser) return;

    // Load reports
    await loadReports();

    // Setup form handler
    document.getElementById('createReportForm').addEventListener('submit', handleCreateReport);
});

async function loadReports() {
    const reportsList = document.getElementById('reportsList');
    reportsList.innerHTML = '<div class="loading-spinner"></div>';

    try {
        let url = `${API_URL}/reports?page=${currentPage}&limit=${itemsPerPage}`;
        
        // Add status filter
        const status = document.getElementById('statusFilter').value;
        if (status !== '') {
            url += `&status=${status}`;
        }

        // Handle different tabs
        if (currentTab === 'my-reports') {
            url = `${API_URL}/reports/user/${currentUser.id}?page=${currentPage}&limit=${itemsPerPage}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayReports(data.reports);
            
            if (data.pagination) {
                displayPagination(data.pagination);
                document.getElementById('totalReports').textContent = data.pagination.total;
            }
        } else {
            throw new Error('Failed to load reports');
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        reportsList.innerHTML = '<p class="error">Error loading reports</p>';
    }
}

function displayReports(reports) {
    const reportsList = document.getElementById('reportsList');

    if (reports.length === 0) {
        reportsList.innerHTML = '<p class="no-data">No reports found</p>';
        return;
    }

    const statusNames = ['Open', 'In Progress', 'Resolved', 'Closed'];
    const statusClasses = ['open', 'in-progress', 'resolved', 'closed'];

    reportsList.innerHTML = reports.map(report => `
        <div class="report-card">
            <div class="report-header">
                <h3 class="report-title">Report #${report.id}</h3>
                <div class="report-meta">
                    <span class="report-status status-${statusClasses[report.status]}">${statusNames[report.status]}</span>
                    <span class="report-points">+${report.vulnerability_points} Points</span>
                </div>
            </div>
            <div class="report-body">
                <div class="report-info">
                    <div class="info-row">
                        <span class="info-label">User:</span>
                        <span class="info-value">${report.username} (ID: ${report.user_id})</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Vulnerability:</span>
                        <span class="info-value">${report.vulnerability_title} 
                            <span class="severity severity-${report.vulnerability_severity}">${report.vulnerability_severity}</span>
                        </span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">User Reputation:</span>
                        <span class="info-value">${report.user_reputation}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Created:</span>
                        <span class="info-value">${formatDate(report.created_at)}</span>
                    </div>
                </div>
            </div>
            <div class="report-actions">
                <button class="btn-action" onclick="viewReportDetails(${report.id})">View Details</button>
                ${report.status < 3 ? 
                    `<button class="btn-action btn-status" onclick="updateStatus(${report.id}, ${report.status})">Update Status</button>` : 
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
    loadReports();
}

function switchReportTab(tab) {
    currentTab = tab;
    currentPage = 1;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadReports();
}

// Modal functions
function openCreateReportModal() {
    document.getElementById('createReportModal').style.display = 'block';
}

function closeCreateReportModal() {
    document.getElementById('createReportModal').style.display = 'none';
    document.getElementById('createReportForm').reset();
}

function closeReportDetailsModal() {
    document.getElementById('reportDetailsModal').style.display = 'none';
}

async function handleCreateReport(e) {
    e.preventDefault();

    const userId = parseInt(document.getElementById('userId').value);
    const vulnerabilityId = parseInt(document.getElementById('vulnerabilityId').value);

    try {
        const response = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                user_id: userId, 
                vulnerability_id: vulnerabilityId 
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(`Report created successfully! User ${data.user.username} awarded ${data.user.pointsAwarded} points. New reputation: ${data.user.updatedReputation}`, 'success');
            closeCreateReportModal();
            loadReports();
        } else {
            showNotification(data.message || 'Error creating report', 'error');
        }
    } catch (error) {
        console.error('Error creating report:', error);
        showNotification('Error creating report', 'error');
    }
}

async function viewReportDetails(reportId) {
    const modal = document.getElementById('reportDetailsModal');
    const detailsDiv = document.getElementById('reportDetails');
    
    modal.style.display = 'block';
    detailsDiv.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch(`${API_URL}/reports/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const report = data.report;
            
            const statusNames = ['Open', 'In Progress', 'Resolved', 'Closed'];
            const statusClasses = ['open', 'in-progress', 'resolved', 'closed'];

            detailsDiv.innerHTML = `
                <div class="detail-section">
                    <h3>Report Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Report ID:</span>
                            <span class="detail-value">#${report.id}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value status-${statusClasses[report.status]}">${statusNames[report.status]}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Created:</span>
                            <span class="detail-value">${formatDate(report.created_at)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Updated:</span>
                            <span class="detail-value">${formatDate(report.updated_at)}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>User Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Username:</span>
                            <span class="detail-value">${report.username}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">User ID:</span>
                            <span class="detail-value">${report.user_id}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Reputation:</span>
                            <span class="detail-value">${report.user_reputation}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Vulnerability Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Title:</span>
                            <span class="detail-value">${report.vulnerability_title}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Severity:</span>
                            <span class="detail-value severity-${report.vulnerability_severity}">${report.vulnerability_severity}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Points:</span>
                            <span class="detail-value">+${report.vulnerability_points}</span>
                        </div>
                    </div>
                    <div class="detail-description">
                        <span class="detail-label">Description:</span>
                        <p>${report.vulnerability_description}</p>
                    </div>
                </div>

                ${report.status < 3 ? `
                    <div class="detail-actions">
                        <button class="btn-primary" onclick="updateStatus(${report.id}, ${report.status})">
                            Update Status
                        </button>
                    </div>
                ` : ''}
            `;

            document.getElementById('reportDetailsTitle').textContent = `Report #${report.id} Details`;
        } else {
            throw new Error('Failed to load report details');
        }
    } catch (error) {
        console.error('Error loading report details:', error);
        detailsDiv.innerHTML = '<p class="error">Error loading report details</p>';
    }
}

async function updateStatus(reportId, currentStatus) {
    const statusNames = ['Open', 'In Progress', 'Resolved', 'Closed'];
    const nextStatus = currentStatus + 1;

    if (nextStatus > 3) return;

    const confirmed = confirm(`Update status from "${statusNames[currentStatus]}" to "${statusNames[nextStatus]}"?`);
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/reports/${reportId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: nextStatus })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Status updated successfully', 'success');
            loadReports();
            closeReportDetailsModal();
        } else {
            showNotification(data.message || 'Error updating status', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Error updating status', 'error');
    }
}

// Format date helper
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Show notification helper
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Require authentication helper
async function requireAuth() {
    const user = await checkAuth();
    if (!user) {
        window.location.href = '/login.html';
        return null;
    }
    return user;
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}