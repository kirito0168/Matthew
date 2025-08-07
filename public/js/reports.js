// Vulnerability Reports Page JavaScript
// This file handles all functionality for the reports page

// Global variables
let currentTab = 'all';
let currentPage = 1;
const itemsPerPage = 10;
let allVulnerabilities = [];
let selectedVulnerability = null;

// Ensure API_URL is defined
if (typeof API_URL === 'undefined') {
    window.API_URL = '/api';
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing reports page...');
    
    try {
        // Update navigation if function exists
        if (typeof updateNavigation === 'function') {
            await updateNavigation();
        }

        // Check authentication
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!token || !user.id) {
            console.log('No authentication found, redirecting to login...');
            window.location.href = '/login.html';
            return;
        }

        console.log('User authenticated:', user.username);

        // Load initial data
        await loadVulnerabilities();
        await loadReports();
        await loadStats();

        // Setup event handlers
        setupEventHandlers();
        
    } catch (error) {
        console.error('Error initializing reports page:', error);
        showNotification('Error initializing page. Please refresh.', 'error');
    }
});

// Setup all event handlers
function setupEventHandlers() {
    // Form submission handler
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }

    // Modal close on outside click
    window.onclick = function(event) {
        const modal = document.getElementById('reportModal');
        if (event.target === modal) {
            closeReportModal();
        }
    };

    // Vulnerability select change handler
    const vulnSelect = document.getElementById('vulnerabilitySelect');
    if (vulnSelect) {
        vulnSelect.addEventListener('change', updateVulnerabilityInfo);
    }
}

// Load vulnerabilities for dropdown
async function loadVulnerabilities() {
    console.log('Loading vulnerabilities...');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/vulnerabilities?limit=100`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            allVulnerabilities = data.vulnerabilities || [];
            console.log(`Loaded ${allVulnerabilities.length} vulnerabilities`);
            populateVulnerabilityDropdown();
        } else {
            console.error('Failed to load vulnerabilities:', response.status);
            allVulnerabilities = [];
        }
    } catch (error) {
        console.error('Error loading vulnerabilities:', error);
        allVulnerabilities = [];
    }
}

// Populate vulnerability dropdown
function populateVulnerabilityDropdown() {
    const select = document.getElementById('vulnerabilitySelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select a vulnerability to report on --</option>';
    
    // Only show open vulnerabilities
    const openVulnerabilities = allVulnerabilities.filter(v => 
        v.status === 'open' || v.status === 'in_progress'
    );
    
    openVulnerabilities.forEach(vuln => {
        const option = document.createElement('option');
        option.value = vuln.id;
        option.textContent = `#${vuln.id} - ${vuln.title} (${vuln.severity.toUpperCase()})`;
        select.appendChild(option);
    });
    
    console.log(`Populated dropdown with ${openVulnerabilities.length} open vulnerabilities`);
}

// Update vulnerability info when selected
function updateVulnerabilityInfo() {
    const select = document.getElementById('vulnerabilitySelect');
    const infoDiv = document.getElementById('vulnerabilityInfo');
    const detailsDiv = document.getElementById('vulnDetails');
    
    if (!select || !infoDiv || !detailsDiv) return;
    
    if (select.value) {
        selectedVulnerability = allVulnerabilities.find(v => v.id == select.value);
        if (selectedVulnerability) {
            detailsDiv.innerHTML = `
                <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">
                    ${escapeHtml(selectedVulnerability.title)}
                </h4>
                <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">
                    <strong>Severity:</strong> ${selectedVulnerability.severity.toUpperCase()} | 
                    <strong>EXP Reward:</strong> ${selectedVulnerability.exp_reward || 100}
                </p>
                <p style="color: var(--text-primary);">
                    ${escapeHtml(selectedVulnerability.description)}
                </p>
                ${selectedVulnerability.reporter_name ? 
                    `<p style="color: var(--text-secondary); margin-top: 0.5rem;">
                        <strong>Reported by:</strong> ${escapeHtml(selectedVulnerability.reporter_name)}
                    </p>` : ''}
            `;
            infoDiv.classList.add('show');
        }
    } else {
        infoDiv.classList.remove('show');
        selectedVulnerability = null;
    }
}

// Load reports
async function loadReports() {
    console.log('Loading reports...');
    const reportsList = document.getElementById('reportsList');
    
    if (!reportsList) {
        console.error('Reports list element not found');
        return;
    }
    
    reportsList.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        let url = `${API_URL}/reports?page=${currentPage}&limit=${itemsPerPage}`;
        
        // Add filters based on current tab
        if (currentTab === 'my-reports' && user.id) {
            url = `${API_URL}/reports/user/${user.id}?page=${currentPage}&limit=${itemsPerPage}`;
        } else if (currentTab !== 'all') {
            const statusMap = {
                'open': 0,
                'in-progress': 1,
                'resolved': 2
            };
            if (statusMap[currentTab] !== undefined) {
                url += `&status=${statusMap[currentTab]}`;
            }
        }

        console.log('Fetching reports from:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Reports loaded:', data);
            displayReports(data.reports || []);
            displayPagination(data.pagination || {});
        } else {
            console.error('Failed to load reports:', response.status);
            throw new Error(`Server returned ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        reportsList.innerHTML = `
            <div class="error">
                Failed to load reports. Please check your connection and try again.
                <br><small>${error.message}</small>
            </div>
        `;
    }
}

// Display reports
function displayReports(reports) {
    const reportsList = document.getElementById('reportsList');
    if (!reportsList) return;
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    if (!reports || reports.length === 0) {
        reportsList.innerHTML = `
            <div class="no-data">
                No reports found. Be the first to submit a vulnerability report!
            </div>
        `;
        return;
    }

    console.log(`Displaying ${reports.length} reports`);

    reportsList.innerHTML = reports.map(report => {
        const isOwner = currentUser.id === report.user_id;
        const statusText = getStatusText(report.status);
        const statusClass = getStatusClass(report.status);

        return `
            <div class="report-card">
                <div class="report-header">
                    <div class="report-info">
                        <h3 class="report-title">Report #${report.id}</h3>
                        <div class="report-vulnerability">
                            Vulnerability: <a href="#" onclick="viewVulnerability(${report.vulnerability_id}); return false;">
                                ${escapeHtml(report.vulnerability_title || `Vulnerability #${report.vulnerability_id}`)}
                            </a>
                        </div>
                        <div class="report-reporter">
                            Reported by: ${escapeHtml(report.username || 'Anonymous')}
                        </div>
                    </div>
                    <div class="report-meta">
                        <span class="report-status ${statusClass}">${statusText}</span>
                        <span class="report-exp">+${report.vulnerability_points || 100} EXP</span>
                        <span class="report-date">${formatDate(report.created_at)}</span>
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn-action" onclick="viewReportDetails(${report.id})">
                        View Details
                    </button>
                    ${isOwner && report.status === 0 ? `
                        <button class="btn-action" onclick="updateReportStatus(${report.id}, 1)">
                            Mark In Progress
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Load statistics
async function loadStats() {
    console.log('Loading statistics...');
    
    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        const response = await fetch(`${API_URL}/reports?limit=1000`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const reports = data.reports || [];
            
            // Calculate stats
            const totalReports = reports.length;
            const openReports = reports.filter(r => r.status === 0).length;
            const resolvedReports = reports.filter(r => r.status === 2).length;
            const userReports = reports.filter(r => r.user_id === user.id).length;

            // Update display
            updateStatDisplay('totalReports', totalReports);
            updateStatDisplay('openReports', openReports);
            updateStatDisplay('resolvedReports', resolvedReports);
            updateStatDisplay('userReports', userReports);
            
            console.log('Stats updated:', { totalReports, openReports, resolvedReports, userReports });
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        // Set default values on error
        updateStatDisplay('totalReports', 0);
        updateStatDisplay('openReports', 0);
        updateStatDisplay('resolvedReports', 0);
        updateStatDisplay('userReports', 0);
    }
}

function updateStatDisplay(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// Handle report submission
async function handleReportSubmit(e) {
    e.preventDefault();
    console.log('Submitting report...');

    const vulnerabilityId = document.getElementById('vulnerabilitySelect').value;
    const findings = document.getElementById('reportFindings').value;
    const severity = document.getElementById('severityAssessment').value;
    const notes = document.getElementById('additionalNotes').value;

    if (!vulnerabilityId) {
        showNotification('Please select a vulnerability', 'error');
        return;
    }

    if (!findings || findings.trim().length < 10) {
        showNotification('Please provide detailed findings (at least 10 characters)', 'error');
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    if (!user.id || !token) {
        showNotification('Authentication required. Please login again.', 'error');
        setTimeout(() => window.location.href = '/login.html', 2000);
        return;
    }

    try {
        // Prepare report data - using the exact format expected by the backend
        const reportData = {
            user_id: parseInt(user.id),
            vulnerability_id: parseInt(vulnerabilityId)
        };

        console.log('Sending report data:', reportData);

        const response = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reportData)
        });

        const responseData = await response.json();
        console.log('Server response:', responseData);

        if (response.ok) {
            showNotification('Report submitted successfully! You earned EXP points.', 'success');
            closeReportModal();
            
            // Reload data
            await loadReports();
            await loadStats();
            
            // Reset form
            document.getElementById('reportForm').reset();
            document.getElementById('vulnerabilityInfo').classList.remove('show');
        } else {
            throw new Error(responseData.message || 'Failed to submit report');
        }
    } catch (error) {
        console.error('Error submitting report:', error);
        showNotification(error.message || 'Error submitting report. Please try again.', 'error');
    }
}

// View vulnerability details
function viewVulnerability(vulnerabilityId) {
    console.log('Viewing vulnerability:', vulnerabilityId);
    // You can implement navigation to vulnerability details page
    // window.location.href = `/vulnerabilities.html#${vulnerabilityId}`;
}

// View report details
async function viewReportDetails(reportId) {
    console.log('Viewing report details:', reportId);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reports/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Report details:', data.report);
            // You can show details in a modal or navigate to details page
            showNotification('Report details loaded (check console)', 'info');
        } else {
            throw new Error('Failed to load report details');
        }
    } catch (error) {
        console.error('Error loading report details:', error);
        showNotification('Error loading report details', 'error');
    }
}

// Update report status
async function updateReportStatus(reportId, newStatus) {
    console.log('Updating report status:', reportId, newStatus);
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    if (!user.id || !token) {
        showNotification('Authentication required', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/reports/${reportId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: newStatus,
                user_id: parseInt(user.id)
            })
        });

        const responseData = await response.json();
        console.log('Update response:', responseData);

        if (response.ok) {
            showNotification('Report status updated successfully', 'success');
            await loadReports();
            await loadStats();
        } else {
            throw new Error(responseData.message || 'Failed to update report status');
        }
    } catch (error) {
        console.error('Error updating report:', error);
        showNotification(error.message || 'Error updating report status', 'error');
    }
}

// Switch tabs
function switchTab(tab) {
    console.log('Switching to tab:', tab);
    currentTab = tab;
    currentPage = 1;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the correct button
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => {
        const btnText = btn.textContent.toLowerCase();
        if (tab === 'all' && btnText.includes('all')) return true;
        if (tab === 'my-reports' && btnText.includes('my')) return true;
        if (tab === 'open' && btnText.includes('open')) return true;
        if (tab === 'in-progress' && btnText.includes('progress')) return true;
        if (tab === 'resolved' && btnText.includes('resolved')) return true;
        return false;
    });
    
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Reload reports
    loadReports();
}

// Pagination
function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    
    if (!pagination || pagination.totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let html = '<div class="pagination-controls">';
    
    if (pagination.page > 1) {
        html += `<button class="page-btn" onclick="changePage(${pagination.page - 1})">Previous</button>`;
    }

    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);

    for (let i = startPage; i <= endPage; i++) {
        if (i === pagination.page) {
            html += `<span class="page-current">${i}</span>`;
        } else {
            html += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
        }
    }

    if (pagination.page < pagination.totalPages) {
        html += `<button class="page-btn" onclick="changePage(${pagination.page + 1})">Next</button>`;
    }

    html += '</div>';
    paginationDiv.innerHTML = html;
}

function changePage(page) {
    console.log('Changing to page:', page);
    currentPage = page;
    loadReports();
}

// Modal functions
function openReportModal() {
    console.log('Opening report modal');
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('reportForm').reset();
        const infoDiv = document.getElementById('vulnerabilityInfo');
        if (infoDiv) {
            infoDiv.classList.remove('show');
        }
    }
}

function closeReportModal() {
    console.log('Closing report modal');
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Helper functions
function getStatusText(status) {
    const statusMap = {
        0: 'Open',
        1: 'In Progress',
        2: 'Resolved',
        3: 'Closed'
    };
    return statusMap[status] || 'Unknown';
}

function getStatusClass(status) {
    const classMap = {
        0: 'status-open',
        1: 'status-in_progress',
        2: 'status-resolved',
        3: 'status-closed'
    };
    return classMap[status] || '';
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

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showNotification(message, type = 'info') {
    console.log(`Notification (${type}):`, message);
    
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'notification show';
    notification.textContent = message;
    
    const bgColor = type === 'success' ? 'rgba(76, 175, 80, 0.9)' : 
                    type === 'error' ? 'rgba(244, 67, 54, 0.9)' : 
                    'rgba(0, 212, 255, 0.9)';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${bgColor};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export functions to global scope
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.viewReportDetails = viewReportDetails;
window.updateReportStatus = updateReportStatus;
window.switchTab = switchTab;
window.changePage = changePage;
window.viewVulnerability = viewVulnerability;
window.updateVulnerabilityInfo = updateVulnerabilityInfo;