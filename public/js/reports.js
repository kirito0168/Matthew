// Vulnerability Reports Page JavaScript
// This file handles all functionality for the reports page

// Global variables
let currentTab = 'all';
let currentPage = 1;
const itemsPerPage = 10;
let allVulnerabilities = [];
let selectedVulnerability = null;
let currentUser = null;

// Ensure API_URL is defined
if (typeof API_URL === 'undefined') {
    window.API_URL = '/api';
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing reports page...');
    
    try {
        // Update navigation if function exists
        if (typeof updateNavigation === 'function') {
            console.log('📡 Updating navigation...');
            await updateNavigation();
        }

        // Check authentication
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (!token || !userData) {
            console.log('❌ No authentication found, redirecting to login...');
            window.location.href = '/login.html';
            return;
        }

        try {
            currentUser = JSON.parse(userData);
        } catch (e) {
            console.error('❌ Invalid user data, redirecting to login...');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }

        if (!currentUser || !currentUser.id) {
            console.log('❌ Invalid user data, redirecting to login...');
            window.location.href = '/login.html';
            return;
        }

        console.log('✅ User authenticated:', currentUser.username);

        // Load initial data in sequence
        console.log('📊 Loading initial data...');
        await loadVulnerabilities();
        await loadReports();
        await loadStats();

        // Setup event handlers
        setupEventHandlers();
        
        console.log('✅ Reports page initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing reports page:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error initializing page. Please refresh and try again.', 'error');
        } else {
            alert('Error initializing page. Please refresh and try again.');
        }
    }
});

// Setup event handlers
function setupEventHandlers() {
    console.log('⚙️ Setting up event handlers...');
    
    // Report form submission
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.getAttribute('data-tab');
            if (tabId) {
                switchTab(tabId);
            }
        });
    });

    // Modal handlers
    const reportModal = document.getElementById('reportModal');
    const closeModalBtn = document.querySelector('.modal-close');
    
    if (closeModalBtn && reportModal) {
        closeModalBtn.addEventListener('click', closeReportModal);
    }

    // Submit report button
    const submitReportBtn = document.getElementById('submitReportBtn');
    if (submitReportBtn) {
        submitReportBtn.addEventListener('click', openReportModal);
    }

    console.log('✅ Event handlers setup complete');
}

// Load vulnerabilities for dropdown
async function loadVulnerabilities() {
    console.log('🔧 Loading vulnerabilities...');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/vulnerabilities?status=open&limit=100`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            allVulnerabilities = data.vulnerabilities || [];
            populateVulnerabilityDropdown();
            console.log('✅ Loaded vulnerabilities:', allVulnerabilities.length);
        } else {
            console.error('❌ Failed to load vulnerabilities:', response.status);
        }
    } catch (error) {
        console.error('❌ Error loading vulnerabilities:', error);
    }
}

// Populate vulnerability dropdown
function populateVulnerabilityDropdown() {
    const dropdown = document.getElementById('vulnerabilitySelect');
    if (!dropdown) {
        console.warn('⚠️ Vulnerability dropdown not found');
        return;
    }

    // Clear existing options except the first one
    dropdown.innerHTML = '<option value="">Choose a vulnerability...</option>';
    
    allVulnerabilities.forEach(vuln => {
        const option = document.createElement('option');
        option.value = vuln.id;
        option.textContent = `${vuln.title} (${vuln.severity}) - ${vuln.exp_reward} EXP`;
        dropdown.appendChild(option);
    });
    
    console.log('✅ Vulnerability dropdown populated');
}

// Load reports based on current filters
async function loadReports() {
    console.log(`📊 Loading reports for tab: ${currentTab}, page: ${currentPage}`);
    
    const reportsList = document.getElementById('reportsList');
    if (!reportsList) {
        console.error('❌ Reports list element not found');
        return;
    }

    // Show loading state
    reportsList.innerHTML = createLoadingHTML();

    try {
        const token = localStorage.getItem('token');
        let url = `${API_URL}/reports?page=${currentPage}&limit=${itemsPerPage}`;
        
        // Add filters based on current tab
        if (currentTab === 'my') {
            url += `&userId=${currentUser.id}`;
        } else if (currentTab === 'pending') {
            url += '&status=0';
        } else if (currentTab === 'resolved') {
            url += '&status=2';
        }

        console.log('🌐 Fetching reports from:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('📨 Reports response:', {
                success: data.success,
                count: data.reports ? data.reports.length : 0,
                pagination: data.pagination
            });
            
            displayReports(data.reports || []);
            displayPagination(data.pagination || {});
        } else {
            const errorText = await response.text();
            console.error('❌ Failed to load reports:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Error loading reports:', error);
        reportsList.innerHTML = `
            <div class="error">
                ❌ Failed to load reports. Please check your connection and try again.
                <br><small>Error: ${error.message}</small>
            </div>
        `;
    }
}

// Create loading HTML
function createLoadingHTML() {
    return `
        <div class="loading-container">
            <div class="loading-spinner">
                <div class="spinner-circle"></div>
                <div class="spinner-text">Loading reports...</div>
            </div>
        </div>
    `;
}

// Display reports in the UI
function displayReports(reports) {
    const reportsList = document.getElementById('reportsList');
    if (!reportsList) {
        console.error('❌ Reports list element not found');
        return;
    }

    if (!reports || reports.length === 0) {
        reportsList.innerHTML = `
            <div class="no-data">
                📝 No reports found for "${currentTab}" filter.
                ${currentTab === 'all' ? 'Be the first to submit a vulnerability report!' : ''}
            </div>
        `;
        console.log('ℹ️ No reports to display');
        return;
    }

    console.log(`🎨 Displaying ${reports.length} reports`);

    const reportsHTML = reports.map(report => {
        const isOwner = currentUser.id === report.user_id;
        const statusText = getStatusText(report.status);
        const statusClass = getStatusClass(report.status);
        const canResolve = report.vulnerability_reporter_id === currentUser.id && report.status !== 2;

        return `
            <div class="report-card" data-report-id="${report.id}">
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
                        <span class="report-exp">+${report.vulnerability_points || report.points || 100} EXP</span>
                        <span class="report-date">${formatDate(report.created_at)}</span>
                    </div>
                </div>
                <div class="report-content">
                    <div class="report-description">
                        ${escapeHtml((report.findings || 'No findings provided').substring(0, 200))}${(report.findings && report.findings.length > 200) ? '...' : ''}
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn-action" onclick="viewReportDetails(${report.id})" title="View full report details">
                        👁️ View Details
                    </button>
                    ${isOwner && report.status === 0 ? 
                        `<button class="btn-action btn-danger" onclick="deleteReport(${report.id})" title="Delete this report">
                            🗑️ Delete
                        </button>` : ''}
                    ${canResolve ? 
                        `<button class="btn-action btn-success" onclick="resolveReport(${report.id})" title="Mark as resolved">
                            ✅ Mark Resolved
                        </button>` : ''}
                </div>
            </div>
        `;
    }).join('');

    reportsList.innerHTML = reportsHTML;
}

// Load and display statistics
async function loadStats() {
    console.log('📈 Loading statistics...');
    const statsContainer = document.getElementById('reportsStats');
    if (!statsContainer) {
        console.log('ℹ️ Stats container not found, skipping stats load');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        
        // For now, show placeholder stats
        // TODO: Implement actual stats API endpoints
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">📊</div>
                    <div class="stat-label">Total Reports</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">🔓</div>
                    <div class="stat-label">Open Reports</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">✅</div>
                    <div class="stat-label">Resolved Reports</div>
                </div>
            </div>
        `;
        console.log('✅ Stats placeholder loaded');
    } catch (error) {
        console.error('❌ Error loading stats:', error);
    }
}

// Switch between filter tabs
function switchTab(tabId) {
    console.log(`🔄 Switching to tab: ${tabId}`);
    
    // Update active tab UI
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Update current tab and reload
    currentTab = tabId;
    currentPage = 1; // Reset to first page when changing tabs
    
    // Reload reports with new filter
    loadReports();
}

// Open report modal
function openReportModal() {
    console.log('📝 Opening report modal...');
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'block';
        
        // Reset form
        const form = document.getElementById('reportForm');
        if (form) {
            form.reset();
        }
    }
}

// Close report modal
function closeReportModal() {
    console.log('❌ Closing report modal...');
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle report form submission
async function handleReportSubmit(event) {
    event.preventDefault();
    console.log('📝 Handling report submission...');
    
    const vulnerabilityId = document.getElementById('vulnerabilitySelect').value;
    const findings = document.getElementById('findings').value.trim();
    
    if (!vulnerabilityId) {
        showNotification('Please select a vulnerability', 'error');
        return;
    }
    
    if (!findings) {
        showNotification('Please provide your findings', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        console.log('🌐 Submitting report...');
        
        const response = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                vulnerability_id: parseInt(vulnerabilityId),
                findings: findings
            })
        });

        const data = await response.json();
        console.log('📨 Submit response:', { status: response.status, success: data.success });

        if (response.ok && data.success) {
            console.log('✅ Report submitted successfully');
            showNotification('Report submitted successfully! 🎉', 'success');
            closeReportModal();
            await loadReports(); // Reload to show new report
        } else {
            throw new Error(data.message || 'Failed to submit report');
        }
    } catch (error) {
        console.error('❌ Error submitting report:', error);
        showNotification(`❌ ${error.message}`, 'error');
    }
}

// View report details
async function viewReportDetails(reportId) {
    console.log(`👁️ Viewing details for report: ${reportId}`);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reports/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('📨 Report details response:', { status: response.status, success: data.success });

        if (response.ok && data.success) {
            displayReportDetailsModal(data.report);
        } else {
            throw new Error(data.message || 'Failed to load report details');
        }
    } catch (error) {
        console.error('❌ Error loading report details:', error);
        showNotification(`❌ ${error.message}`, 'error');
    }
}

// Display report details in modal
function displayReportDetailsModal(report) {
    const modal = document.getElementById('reportDetailsModal') || createReportDetailsModal();
    
    const statusText = getStatusText(report.status);
    const statusClass = getStatusClass(report.status);
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Report #${report.id} Details</h2>
                <button class="modal-close" onclick="closeReportDetailsModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="report-detail-section">
                    <h3>📋 Report Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="report-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Submitted:</span>
                            <span>${formatDate(report.created_at)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Reporter:</span>
                            <span>${escapeHtml(report.username || 'Anonymous')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Points:</span>
                            <span>+${report.vulnerability_points || report.points || 100} EXP</span>
                        </div>
                    </div>
                </div>
                
                <div class="report-detail-section">
                    <h3>🎯 Vulnerability</h3>
                    <div class="vulnerability-info">
                        <div class="vuln-title">${escapeHtml(report.vulnerability_title || 'Unknown Vulnerability')}</div>
                        <div class="vuln-severity">Severity: ${report.vulnerability_severity || 'Unknown'}</div>
                    </div>
                </div>
                
                <div class="report-detail-section">
                    <h3>🔍 Findings</h3>
                    <div class="findings-content">
                        ${escapeHtml(report.findings || 'No findings provided').replace(/\n/g, '<br>')}
                    </div>
                </div>
                
                ${report.status !== 2 && report.vulnerability_reporter_id === currentUser.id ? `
                <div class="report-detail-actions">
                    <button class="btn-action btn-success" onclick="resolveReport(${report.id}); closeReportDetailsModal();">
                        ✅ Mark as Resolved
                    </button>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Create report details modal if it doesn't exist
function createReportDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'reportDetailsModal';
    modal.className = 'modal';
    document.body.appendChild(modal);
    return modal;
}

// Close report details modal
function closeReportDetailsModal() {
    const modal = document.getElementById('reportDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// View vulnerability details
async function viewVulnerability(vulnerabilityId) {
    console.log(`🎯 Viewing vulnerability: ${vulnerabilityId}`);
    // Redirect to vulnerabilities page with the specific vulnerability
    window.location.href = `/vulnerabilities.html#${vulnerabilityId}`;
}

// Delete report
async function deleteReport(reportId) {
    console.log(`🗑️ Attempting to delete report: ${reportId}`);
    
    if (!confirm('⚠️ Are you sure you want to delete this report? This action cannot be undone.')) {
        console.log('❌ Delete cancelled by user');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        console.log('🌐 Sending delete request...');
        
        const response = await fetch(`${API_URL}/reports/${reportId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('📨 Delete response:', { status: response.status, success: data.success });

        if (response.ok && data.success) {
            console.log('✅ Report deleted successfully');
            showNotification('🗑️ Report deleted successfully', 'success');
            await loadReports(); // Reload to remove deleted report
        } else {
            throw new Error(data.message || 'Failed to delete report');
        }
    } catch (error) {
        console.error('❌ Error deleting report:', error);
        showNotification(`❌ ${error.message}`, 'error');
    }
}

// Resolve report
async function resolveReport(reportId) {
    console.log(`✅ Attempting to resolve report: ${reportId}`);
    
    if (!confirm('✅ Mark this report as resolved? This will close the report.')) {
        console.log('❌ Resolve cancelled by user');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        console.log('🌐 Sending resolve request...');
        
        const response = await fetch(`${API_URL}/reports/${reportId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 2 })
        });

        const data = await response.json();
        console.log('📨 Resolve response:', { status: response.status, success: data.success });

        if (response.ok && data.success) {
            console.log('✅ Report resolved successfully');
            showNotification('✅ Report marked as resolved', 'success');
            await loadReports(); // Reload to update status
        } else {
            throw new Error(data.message || 'Failed to resolve report');
        }
    } catch (error) {
        console.error('❌ Error resolving report:', error);
        showNotification(`❌ ${error.message}`, 'error');
    }
}

// Pagination functions
function displayPagination(pagination) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    const { page = 1, limit = 10 } = pagination;
    
    let paginationHTML = '<div class="pagination-controls">';
    
    // Previous button
    if (page > 1) {
        paginationHTML += `<button onclick="changePage(${page - 1})" class="btn-action">⬅️ Previous</button>`;
    }
    
    // Page info
    paginationHTML += `<span class="page-info">📄 Page ${page}</span>`;
    
    // Next button (simplified - in real app you'd check if there are more results)
    paginationHTML += `<button onclick="changePage(${page + 1})" class="btn-action">Next ➡️</button>`;
    
    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
}

function changePage(page) {
    console.log(`📄 Changing to page: ${page}`);
    currentPage = Math.max(1, page); // Ensure page is at least 1
    loadReports();
}

// Utility functions
function getStatusText(status) {
    const statusMap = {
        0: 'Open',
        1: 'In Progress', 
        2: 'Resolved',
        '-1': 'Deleted'
    };
    return statusMap[status] || 'Unknown';
}

function getStatusClass(status) {
    const classMap = {
        0: 'status-open',
        1: 'status-progress',
        2: 'status-resolved',
        '-1': 'status-deleted'
    };
    return classMap[status] || 'status-unknown';
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch (error) {
        console.error('❌ Error formatting date:', error);
        return 'Invalid Date';
    }
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Use global showNotification if available, otherwise create simple alert
    if (window.showNotification && typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Export functions to global scope
window.switchTab = switchTab;
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.viewReportDetails = viewReportDetails;
window.closeReportDetailsModal = closeReportDetailsModal;
window.viewVulnerability = viewVulnerability;
window.deleteReport = deleteReport;
window.resolveReport = resolveReport;
window.changePage = changePage;

console.log('📦 Reports.js loaded successfully');