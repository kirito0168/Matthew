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
    console.log('🔧 Setting up event handlers...');
    
    // Submit report form
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.getAttribute('data-tab');
            if (tabId) {
                switchTab(tabId);
            }
        });
    });

    console.log('✅ Event handlers setup complete');
}

// Handle report form submission
async function handleReportSubmit(e) {
    e.preventDefault();
    console.log('📝 Submitting new report...');

    const formData = new FormData(e.target);
    const reportData = {
        vulnerability_id: parseInt(formData.get('vulnerability_id')),
        description: formData.get('description'),
        proof_of_concept: formData.get('proof_of_concept') || '',
        impact_description: formData.get('impact_description') || ''
    };

    console.log('📤 Report data:', reportData);

    if (!reportData.vulnerability_id || !reportData.description) {
        showNotification('❌ Please fill in all required fields', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportData)
        });

        const data = await response.json();
        console.log('📨 Submit response:', { status: response.status, success: data.success });

        if (response.ok && data.success) {
            console.log('✅ Report submitted successfully');
            showNotification('✅ Report submitted successfully!', 'success');
            closeReportModal();
            e.target.reset();
            await loadReports(); // Reload reports list
        } else {
            throw new Error(data.message || 'Failed to submit report');
        }
    } catch (error) {
        console.error('❌ Error submitting report:', error);
        showNotification(`❌ ${error.message}`, 'error');
    }
}

// Load vulnerabilities for the dropdown
async function loadVulnerabilities() {
    console.log('🔍 Loading vulnerabilities...');
    const dropdown = document.getElementById('vulnerabilitySelect');
    if (!dropdown) {
        console.log('ℹ️ Vulnerability dropdown not found, skipping vulnerabilities load');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/vulnerabilities`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📦 Vulnerabilities response:', { success: data.success, count: data.vulnerabilities?.length });

        if (data.success && data.vulnerabilities) {
            allVulnerabilities = data.vulnerabilities;
            
            // Populate dropdown
            dropdown.innerHTML = '<option value="">Select a vulnerability...</option>';
            allVulnerabilities.forEach(vuln => {
                const option = document.createElement('option');
                option.value = vuln.id;
                option.textContent = `${vuln.title} (${vuln.severity})`;
                dropdown.appendChild(option);
            });

            console.log(`✅ Loaded ${allVulnerabilities.length} vulnerabilities`);
        } else {
            throw new Error(data.message || 'Invalid vulnerabilities response');
        }
    } catch (error) {
        console.error('❌ Error loading vulnerabilities:', error);
        if (dropdown) {
            dropdown.innerHTML = '<option value="">Error loading vulnerabilities</option>';
        }
        showNotification('Error loading vulnerabilities', 'error');
    }
}

// Load and display reports
async function loadReports() {
    console.log(`📊 Loading reports (page: ${currentPage}, tab: ${currentTab})...`);
    const reportsList = safeQuerySelector('#reportsList');
    const loadingSpinner = safeQuerySelector('#loadingSpinner');
    
    if (!reportsList) {
        console.log('ℹ️ Reports list not found, skipping reports load');
        return;
    }

    // Show loading state
    if (loadingSpinner) {
        safeSetStyle(loadingSpinner, 'display', 'block');
    }
    safeSetInnerHTML(reportsList, '<div class="loading-message">Loading reports...</div>');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: itemsPerPage
        });

        // Add status filter based on current tab
        if (currentTab !== 'all') {
            const statusMap = {
                'open': '0',
                'progress': '1', 
                'resolved': '2'
            };
            if (statusMap[currentTab]) {
                params.append('status', statusMap[currentTab]);
            }
        }

        console.log('🌐 Fetching reports with params:', params.toString());

        const response = await fetch(`${API_URL}/reports?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📦 Reports response:', { 
            success: data.success, 
            count: data.reports?.length,
            pagination: data.pagination 
        });

        // Hide loading spinner
        if (loadingSpinner) {
            safeSetStyle(loadingSpinner, 'display', 'none');
        }

        if (data.success) {
            displayReports(data.reports || []);
            
            // Update pagination if provided
            if (data.pagination) {
                displayPagination(data.pagination);
            }
        } else {
            throw new Error(data.message || 'Failed to load reports');
        }

    } catch (error) {
        console.error('❌ Error loading reports:', error);
        
        // Hide loading spinner
        if (loadingSpinner) {
            safeSetStyle(loadingSpinner, 'display', 'none');
        }
        
        safeSetInnerHTML(reportsList, `
            <div class="error-message">
                <p>❌ Error loading reports: ${escapeHtml(error.message)}</p>
                <button onclick="loadReports()" class="btn-action">🔄 Retry</button>
            </div>
        `);
        showNotification('Error loading reports', 'error');
    }
}

// Display reports in the UI
function displayReports(reports) {
    console.log(`🎨 Displaying ${reports.length} reports...`);
    const reportsList = safeQuerySelector('#reportsList');
    
    if (!reportsList) {
        console.log('ℹ️ Reports list container not found');
        return;
    }

    if (!reports || reports.length === 0) {
        safeSetInnerHTML(reportsList, `
            <div class="empty-state">
                <p>📭 No reports found</p>
                <p>Start by submitting your first vulnerability report!</p>
                <button onclick="openReportModal()" class="btn-primary">Submit Report</button>
            </div>
        `);
        return;
    }

    const reportsHTML = reports.map(report => {
        const statusClass = getStatusClass(report.status);
        const statusText = getStatusText(report.status);
        const canDelete = currentUser && currentUser.id && (report.user_id === currentUser.id || currentUser.role === 'admin');
        const canResolve = currentUser && currentUser.role === 'admin' && report.status !== 2;

        return `
            <div class="report-card" data-report-id="${report.id}">
                <div class="report-header">
                    <h3 class="report-title" onclick="viewReportDetails(${report.id})">
                        Report #${report.id}
                    </h3>
                    <span class="report-status ${statusClass}">${statusText}</span>
                </div>
                <div class="report-content">
                    <p class="report-description">${escapeHtml(report.description || 'No description')}</p>
                    ${report.vulnerability_title ? 
                        `<p class="vulnerability-link" onclick="viewVulnerability(${report.vulnerability_id})">
                            🎯 ${escapeHtml(report.vulnerability_title)}
                        </p>` : ''}
                    <div class="report-meta">
                        <span class="report-date">📅 ${formatDate(report.created_at)}</span>
                        <span class="report-author">👤 ${escapeHtml(report.username || 'Unknown')}</span>
                        ${report.points ? `<span class="report-points">⭐ ${report.points} points</span>` : ''}
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn-action btn-view" onclick="viewReportDetails(${report.id})" title="View details">
                        👁️ View Details
                    </button>
                    ${canDelete ? 
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

    safeSetInnerHTML(reportsList, reportsHTML);
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
    const modal = safeQuerySelector('#reportModal');
    if (modal) {
        safeSetStyle(modal, 'display', 'block');
        
        // Reset form
        const form = safeQuerySelector('#reportForm');
        if (form && typeof form.reset === 'function') {
            form.reset();
        }
    } else {
        console.warn('Report modal not found');
        showNotification('Report modal not available', 'error');
    }
}

// Close report modal
function closeReportModal() {
    console.log('❌ Closing report modal...');
    const modal = safeQuerySelector('#reportModal');
    if (modal) {
        safeSetStyle(modal, 'display', 'none');
    }
}

// View report details
async function viewReportDetails(reportId) {
    console.log('👁️ Viewing report details for report:', reportId);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reports/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📦 Report details response:', { success: data.success });

        if (data.success && data.report) {
            displayReportDetailsModal(data.report);
        } else {
            throw new Error(data.message || 'Report not found');
        }
    } catch (error) {
        console.error('❌ Error loading report details:', error);
        showNotification(`❌ ${error.message}`, 'error');
    }
}

// Display report details in modal
function displayReportDetailsModal(report) {
    console.log('🎨 Displaying report details modal for report:', report.id);
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('reportDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reportDetailsModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    const statusClass = getStatusClass(report.status);
    const statusText = getStatusText(report.status);

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Report #${report.id} Details</h2>
                <span class="modal-close" onclick="closeReportDetailsModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="report-detail-section">
                    <h3>Status</h3>
                    <span class="report-status ${statusClass}">${statusText}</span>
                </div>
                
                <div class="report-detail-section">
                    <h3>Description</h3>
                    <p>${escapeHtml(report.description || 'No description provided')}</p>
                </div>
                
                ${report.proof_of_concept ? `
                <div class="report-detail-section">
                    <h3>Proof of Concept</h3>
                    <p>${escapeHtml(report.proof_of_concept)}</p>
                </div>
                ` : ''}
                
                ${report.impact_description ? `
                <div class="report-detail-section">
                    <h3>Impact Description</h3>
                    <p>${escapeHtml(report.impact_description)}</p>
                </div>
                ` : ''}
                
                ${report.findings ? `
                <div class="report-detail-section">
                    <h3>Findings</h3>
                    <p>${escapeHtml(report.findings)}</p>
                </div>
                ` : ''}
                
                <div class="report-detail-section">
                    <h3>Vulnerability</h3>
                    ${report.vulnerability_title ? 
                        `<p onclick="viewVulnerability(${report.vulnerability_id})" class="vulnerability-link">
                            🎯 ${escapeHtml(report.vulnerability_title)}
                        </p>` : 
                        '<p>No vulnerability linked</p>'}
                </div>
                
                <div class="report-detail-section">
                    <h3>Metadata</h3>
                    <p><strong>Submitted by:</strong> ${escapeHtml(report.username || 'Unknown')}</p>
                    <p><strong>Submitted on:</strong> ${formatDate(report.created_at)}</p>
                    ${report.updated_at && report.updated_at !== report.created_at ? 
                        `<p><strong>Last updated:</strong> ${formatDate(report.updated_at)}</p>` : ''}
                    ${report.points ? `<p><strong>Points awarded:</strong> ⭐ ${report.points}</p>` : ''}
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

// Close report details modal
function closeReportDetailsModal() {
    console.log('❌ Closing report details modal...');
    const modal = document.getElementById('reportDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// View vulnerability details
function viewVulnerability(vulnerabilityId) {
    console.log('🎯 Redirecting to vulnerability:', vulnerabilityId);
    if (vulnerabilityId) {
        window.location.href = `/vulnerabilities.html?id=${vulnerabilityId}`;
    }
}

// Delete report
async function deleteReport(reportId) {
    console.log('🗑️ Attempting to delete report:', reportId);
    
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
        console.log('❌ Delete cancelled by user');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        console.log('🌐 Sending delete request...');
        
        const response = await fetch(`${API_URL}/reports/${reportId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('📨 Delete response:', { status: response.status, success: data.success });

        if (response.ok && data.success) {
            console.log('✅ Report deleted successfully');
            showNotification('✅ Report deleted successfully', 'success');
            await loadReports(); // Reload to update list
        } else {
            throw new Error(data.message || 'Failed to delete report');
        }
    } catch (error) {
        console.error('❌ Error deleting report:', error);
        showNotification(`❌ ${error.message}`, 'error');
    }
}

// Resolve report (admin only)
async function resolveReport(reportId) {
    console.log('✅ Attempting to resolve report:', reportId);
    
    if (!confirm('Mark this report as resolved? This will close the report.')) {
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
    // Prevent infinite recursion by checking if this function is already running
    if (showNotification._running) {
        console.warn('showNotification already running, preventing recursion');
        return;
    }
    
    try {
        showNotification._running = true;
        
        // Use global showNotification if available and different from this function
        if (window.showNotification && 
            typeof window.showNotification === 'function' && 
            window.showNotification !== showNotification) {
            window.showNotification(message, type);
            return;
        }
        
        // Fallback notification system
        if (!document.body) {
            console.warn('Document body not available for notification');
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = 'custom-notification';
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        notification.textContent = String(message);
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            try {
                if (notification && notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            } catch (e) {
                console.warn('Error removing notification:', e);
            }
        }, 5000);
        
    } catch (error) {
        console.error('Error in showNotification:', error);
        // Fallback to alert if everything else fails
        if (typeof alert === 'function') {
            alert(message);
        }
    } finally {
        showNotification._running = false;
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