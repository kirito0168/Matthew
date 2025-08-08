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
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!token || !user.id) {
            console.log('❌ No authentication found, redirecting to login...');
            window.location.href = '/login.html';
            return;
        }

        console.log('✅ User authenticated:', user.username);

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
        showNotification('Error initializing page. Please refresh and try again.', 'error');
    }
});

// Setup all event handlers
function setupEventHandlers() {
    console.log('🔧 Setting up event handlers...');
    
    // Form submission handler
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
        console.log('✅ Report form handler attached');
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
        console.log('✅ Vulnerability select handler attached');
    }

    // Tab click handlers
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.getAttribute('data-tab');
            if (tabId) {
                switchTab(tabId);
            }
        });
    });
    console.log('✅ Tab handlers attached');

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeReportModal();
        }
    });
}

// Load vulnerabilities for dropdown
async function loadVulnerabilities() {
    console.log('📦 Loading vulnerabilities...');
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${API_URL}/vulnerabilities?limit=100`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            allVulnerabilities = data.vulnerabilities || [];
            console.log(`✅ Loaded ${allVulnerabilities.length} vulnerabilities`);
            populateVulnerabilitySelect();
        } else {
            const errorData = await response.text();
            console.error('❌ Failed to load vulnerabilities:', response.status, errorData);
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Error loading vulnerabilities:', error);
        showNotification('Failed to load vulnerabilities. Some features may not work.', 'error');
    }
}

// Populate vulnerability dropdown
function populateVulnerabilitySelect() {
    const select = document.getElementById('vulnerabilitySelect');
    if (!select) {
        console.error('❌ Vulnerability select element not found');
        return;
    }

    select.innerHTML = '<option value="">Select a vulnerability...</option>';
    
    if (allVulnerabilities.length === 0) {
        select.innerHTML += '<option value="" disabled>No vulnerabilities available</option>';
        return;
    }
    
    allVulnerabilities.forEach(vuln => {
        const option = document.createElement('option');
        option.value = vuln.id;
        option.textContent = `${vuln.title} (${vuln.severity || 'UNKNOWN'})`;
        option.dataset.vulnerability = JSON.stringify(vuln);
        select.appendChild(option);
    });
    
    console.log(`✅ Populated vulnerability select with ${allVulnerabilities.length} options`);
}

// Update vulnerability info display
function updateVulnerabilityInfo() {
    const select = document.getElementById('vulnerabilitySelect');
    const infoDiv = document.getElementById('vulnerabilityInfo');
    
    if (!select || !infoDiv) {
        console.error('❌ Required elements not found for vulnerability info update');
        return;
    }

    if (select.value) {
        const option = select.options[select.selectedIndex];
        if (option && option.dataset.vulnerability) {
            try {
                selectedVulnerability = JSON.parse(option.dataset.vulnerability);
                const severity = selectedVulnerability.severity || 'UNKNOWN';
                const expReward = selectedVulnerability.exp_reward || 0;
                
                infoDiv.innerHTML = `
                    <div class="vulnerability-details">
                        <h4>${escapeHtml(selectedVulnerability.title)}</h4>
                        <p><strong>Severity:</strong> <span class="severity ${severity.toLowerCase()}">${severity}</span></p>
                        <p><strong>EXP Reward:</strong> ${expReward} points</p>
                        <p><strong>Description:</strong> ${escapeHtml(selectedVulnerability.description || 'No description available')}</p>
                        ${selectedVulnerability.reporter_name ? 
                            `<p style="color: var(--text-secondary); margin-top: 0.5rem;">
                                <strong>Reported by:</strong> ${escapeHtml(selectedVulnerability.reporter_name)}
                            </p>` : ''}
                    </div>
                `;
                infoDiv.classList.add('show');
                console.log('✅ Vulnerability info updated:', selectedVulnerability.title);
            } catch (error) {
                console.error('❌ Error parsing vulnerability data:', error);
                infoDiv.classList.remove('show');
            }
        }
    } else {
        infoDiv.classList.remove('show');
        selectedVulnerability = null;
        console.log('ℹ️ Vulnerability info cleared');
    }
}

// Load reports with current filters
async function loadReports() {
    console.log(`📊 Loading reports (tab: ${currentTab}, page: ${currentPage})...`);
    const reportsList = document.getElementById('reportsList');
    
    if (!reportsList) {
        console.error('❌ Reports list element not found');
        return;
    }
    
    reportsList.innerHTML = '<div class="loading-spinner">🔄 Loading reports...</div>';

    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        let url = `${API_URL}/reports?page=${currentPage}&limit=${itemsPerPage}`;
        
        // Add filters based on current tab
        if (currentTab === 'my-reports' && user.id) {
            url = `${API_URL}/reports/user/${user.id}?page=${currentPage}&limit=${itemsPerPage}`;
            console.log(`📋 Loading user reports for user ID: ${user.id}`);
        } else if (currentTab !== 'all') {
            const statusMap = {
                'open': 0,
                'in-progress': 1,
                'resolved': 2
            };
            if (statusMap[currentTab] !== undefined) {
                url += `&status=${statusMap[currentTab]}`;
                console.log(`📋 Loading reports with status: ${statusMap[currentTab]} (${currentTab})`);
            }
        }

        console.log(`🌐 Fetching reports from: ${url}`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Reports loaded successfully:', {
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

// Display reports in the UI
function displayReports(reports) {
    const reportsList = document.getElementById('reportsList');
    if (!reportsList) {
        console.error('❌ Reports list element not found');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

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

// Handle report form submission
async function handleReportSubmit(event) {
    event.preventDefault();
    console.log('📝 Handling report submission...');
    
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        // Disable submit button and show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Submitting...';

        const formData = new FormData(form);
        const reportData = {
            vulnerability_id: parseInt(formData.get('vulnerability_id')),
            findings: formData.get('findings').trim()
        };

        console.log('📋 Report data:', {
            vulnerability_id: reportData.vulnerability_id,
            findingsLength: reportData.findings.length
        });

        // Validate form data
        if (!reportData.vulnerability_id) {
            throw new Error('Please select a vulnerability from the dropdown');
        }

        if (!reportData.findings || reportData.findings.length < 10) {
            throw new Error('Please provide detailed findings (at least 10 characters)');
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token not found. Please log in again.');
        }

        console.log('🌐 Submitting report to API...');
        const response = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportData)
        });

        const data = await response.json();
        console.log('📨 API response:', { status: response.status, success: data.success });

        if (response.ok && data.success) {
            console.log('✅ Report submitted successfully');
            showNotification('🎉 Report submitted successfully! Thank you for your contribution.', 'success');
            closeReportModal();
            form.reset();
            
            // Clear vulnerability info
            const infoDiv = document.getElementById('vulnerabilityInfo');
            if (infoDiv) {
                infoDiv.classList.remove('show');
            }
            selectedVulnerability = null;
            
            // Reload reports to show the new one
            await loadReports();
        } else {
            throw new Error(data.message || 'Failed to submit report');
        }

    } catch (error) {
        console.error('❌ Error submitting report:', error);
        showNotification(`❌ ${error.message}`, 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Modal functions
function openReportModal() {
    console.log('📋 Opening report modal...');
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Focus on vulnerability select
        const vulnSelect = document.getElementById('vulnerabilitySelect');
        if (vulnSelect) {
            setTimeout(() => vulnSelect.focus(), 100);
        }
    }
}

function closeReportModal() {
    console.log('❌ Closing report modal...');
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// View functions
function viewVulnerability(vulnId) {
    console.log(`👁️ Viewing vulnerability: ${vulnId}`);
    window.location.href = `/vulnerabilities.html#${vulnId}`;
}

function viewReportDetails(reportId) {
    console.log(`👁️ Viewing report details: ${reportId}`);
    // TODO: Implement detailed report view modal or page
    showNotification(`📋 Viewing report #${reportId} (detailed view coming soon)`, 'info');
}

// Report action functions
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
    console.log(`🔔 Notification [${type.toUpperCase()}]: ${message}`);
    
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
    
    // Create new notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add close button
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = ' ✕';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.marginLeft = '10px';
    closeBtn.onclick = () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    };
    notification.appendChild(closeBtn);
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Global functions that need to be accessible from HTML onclick handlers
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.viewVulnerability = viewVulnerability;
window.viewReportDetails = viewReportDetails;
window.deleteReport = deleteReport;
window.resolveReport = resolveReport;
window.changePage = changePage;