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
        // Update navigation if function exists and only if nav-auth element exists
        if (typeof updateNavigation === 'function' && document.querySelector('.nav-auth')) {
            console.log('📡 Updating navigation...');
            await updateNavigation();
        } else {
            console.log('⚠️ Navigation update skipped - no .nav-auth element found or updateNavigation function not available');
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
    
    // Form submission handler
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }

    // Vulnerability selector handler
    const vulnerabilitySelect = document.getElementById('vulnerabilitySelect');
    if (vulnerabilitySelect) {
        vulnerabilitySelect.addEventListener('change', handleVulnerabilitySelect);
    }

    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Modal close handlers
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.modal-close, .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    console.log('✅ Event handlers setup complete');
}

// Load vulnerabilities for the dropdown
async function loadVulnerabilities() {
    console.log('🔍 Loading vulnerabilities...');
    const vulnerabilitySelect = document.getElementById('vulnerabilitySelect');
    
    if (!vulnerabilitySelect) {
        console.log('ℹ️ Vulnerability select element not found, skipping vulnerability load');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/vulnerabilities`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            allVulnerabilities = data.vulnerabilities || [];
            
            console.log(`✅ Loaded ${allVulnerabilities.length} vulnerabilities`);
            
            // Populate dropdown
            vulnerabilitySelect.innerHTML = '<option value="">Select a vulnerability...</option>';
            allVulnerabilities.forEach(vuln => {
                const option = document.createElement('option');
                option.value = vuln.id;
                option.textContent = `${vuln.title} (${vuln.severity})`;
                vulnerabilitySelect.appendChild(option);
            });
        } else {
            throw new Error(`Failed to load vulnerabilities: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error loading vulnerabilities:', error);
        if (vulnerabilitySelect) {
            vulnerabilitySelect.innerHTML = '<option value="">Error loading vulnerabilities</option>';
        }
    }
}

// Handle vulnerability selection
function handleVulnerabilitySelect(event) {
    const vulnerabilityId = event.target.value;
    const vulnerabilityInfo = document.getElementById('vulnerabilityInfo');
    
    if (!vulnerabilityInfo) return;

    if (vulnerabilityId) {
        const vulnerability = allVulnerabilities.find(v => v.id == vulnerabilityId);
        if (vulnerability) {
            selectedVulnerability = vulnerability;
            
            vulnerabilityInfo.innerHTML = `
                <h4>📋 Vulnerability Details</h4>
                <p><strong>Title:</strong> ${escapeHtml(vulnerability.title)}</p>
                <p><strong>Severity:</strong> <span class="severity-${vulnerability.severity.toLowerCase()}">${vulnerability.severity}</span></p>
                <p><strong>Points:</strong> ${vulnerability.points}</p>
                <p><strong>Description:</strong> ${escapeHtml(vulnerability.description)}</p>
            `;
            vulnerabilityInfo.classList.add('show');
        }
    } else {
        selectedVulnerability = null;
        vulnerabilityInfo.classList.remove('show');
    }
}

// Handle report form submission
async function handleReportSubmit(event) {
    event.preventDefault();
    console.log('📝 Submitting report...');

    const submitBtn = document.querySelector('.btn-submit');
    const originalText = submitBtn ? submitBtn.textContent : 'Submit';
    
    try {
        // Disable submit button
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }

        // Get form data using the correct field IDs from the HTML
        const vulnerabilitySelect = document.getElementById('vulnerabilitySelect');
        const findingsTextarea = document.getElementById('findings'); // This is the correct ID from the HTML

        // Validate elements exist
        if (!vulnerabilitySelect) {
            throw new Error('Vulnerability select element not found');
        }
        if (!findingsTextarea) {
            throw new Error('Findings textarea not found');
        }

        const reportData = {
            vulnerability_id: parseInt(vulnerabilitySelect.value),
            description: findingsTextarea.value.trim(),
            proof_of_concept: '',
            impact: '',
            mitigation: ''
        };

        console.log('📤 Report data:', reportData);

        // Validate required fields
        if (!reportData.vulnerability_id || isNaN(reportData.vulnerability_id)) {
            throw new Error('Please select a vulnerability');
        }

        if (!reportData.description) {
            throw new Error('Please provide your findings');
        }

        if (reportData.description.length < 10) {
            throw new Error('Findings must be at least 10 characters long');
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('You must be logged in to submit a report');
        }

        const response = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportData)
        });

        const data = await response.json();
        console.log('📨 Submit response:', { status: response.status, success: data.success, message: data.message });

        if (response.ok && data.success) {
            console.log('✅ Report submitted successfully');
            showNotification('✅ Report submitted successfully!', 'success');
            
            // Reset form
            event.target.reset();
            selectedVulnerability = null;
            const vulnerabilityInfo = document.getElementById('vulnerabilityInfo');
            if (vulnerabilityInfo) {
                vulnerabilityInfo.classList.remove('show');
            }
            
            // Reload reports
            await loadReports();
        } else {
            throw new Error(data.message || `Server error: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error submitting report:', error);
        showNotification(`❌ ${error.message}`, 'error');
    } finally {
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

// Add the missing updateVulnerabilityInfo function
function updateVulnerabilityInfo() {
    const vulnerabilitySelect = document.getElementById('vulnerabilitySelect');
    const vulnerabilityInfo = document.getElementById('vulnerabilityInfo');
    
    if (!vulnerabilitySelect || !vulnerabilityInfo) {
        console.warn('⚠️ Vulnerability select or info element not found');
        return;
    }

    const vulnerabilityId = vulnerabilitySelect.value;
    
    if (vulnerabilityId && allVulnerabilities && allVulnerabilities.length > 0) {
        const vulnerability = allVulnerabilities.find(v => v.id == vulnerabilityId);
        if (vulnerability) {
            selectedVulnerability = vulnerability;
            
            vulnerabilityInfo.innerHTML = `
                <h4>📋 Vulnerability Details</h4>
                <p><strong>Title:</strong> ${escapeHtml(vulnerability.title)}</p>
                <p><strong>Severity:</strong> <span class="severity-${vulnerability.severity.toLowerCase()}">${vulnerability.severity}</span></p>
                <p><strong>Points:</strong> ${vulnerability.exp_reward || 0}</p>
                <p><strong>Description:</strong> ${escapeHtml(vulnerability.description || 'No description available')}</p>
            `;
            vulnerabilityInfo.classList.add('show');
        }
    } else {
        selectedVulnerability = null;
        vulnerabilityInfo.classList.remove('show');
        vulnerabilityInfo.innerHTML = '';
    }
}

// Load and display reports
async function loadReports() {
    console.log('📊 Loading reports...');
    const reportsList = document.getElementById('reportsList');
    
    if (!reportsList) {
        console.log('ℹ️ Reports list element not found, skipping reports load');
        return;
    }

    // Show loading state
    reportsList.innerHTML = '<div class="loading">🔄 Loading reports...</div>';

    try {
        const token = localStorage.getItem('token');
        let url = `${API_URL}/reports?page=${currentPage}&limit=${itemsPerPage}`;
        
        // Add filter based on current tab
        if (currentTab && currentTab !== 'all') {
            const statusMap = {
                'open': 0,
                'progress': 1,
                'resolved': 2
            };
            if (statusMap.hasOwnProperty(currentTab)) {
                url += `&status=${statusMap[currentTab]}`;
            }
        }

        console.log('🌐 Fetching reports from:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('📨 Reports response:', { status: response.status, success: data.success, count: data.reports?.length });

        if (response.ok && data.success) {
            console.log(`✅ Loaded ${data.reports.length} reports`);
            displayReports(data.reports);
            displayPagination(data.pagination);
        } else {
            throw new Error(data.message || 'Failed to load reports');
        }
    } catch (error) {
        console.error('❌ Error loading reports:', error);
        reportsList.innerHTML = `<div class="error-message">❌ Error loading reports: ${error.message}</div>`;
    }
}

// Display reports in the UI
function displayReports(reports) {
    const reportsList = document.getElementById('reportsList');
    
    if (!reports || reports.length === 0) {
        reportsList.innerHTML = '<div class="no-data">📋 No reports found for the current filter</div>';
        return;
    }

    const reportsHTML = reports.map(report => {
        const canDelete = currentUser && (parseInt(report.user_id) === currentUser.id);
        const canResolve = currentUser && (parseInt(report.user_id) === currentUser.id || currentUser.role === 'admin');

        return `
            <div class="report-card" data-report-id="${report.id}">
                <div class="report-header">
                    <h3 class="report-title">${escapeHtml(report.vulnerability_title || 'Unknown Vulnerability')}</h3>
                    <div class="report-meta">
                        <span class="report-status ${getStatusClass(report.status)}">${getStatusText(report.status)}</span>
                        <span class="report-points">💎 ${report.points || 0} points</span>
                        <span class="report-date">📅 ${formatDate(report.created_at)}</span>
                    </div>
                </div>
                
                <div class="report-body">
                    <div class="report-info">
                        <div class="info-row">
                            <span class="info-label">Reporter:</span>
                            <span class="info-value">${escapeHtml(report.username || 'Unknown')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Severity:</span>
                            <span class="info-value severity-${(report.severity || 'unknown').toLowerCase()}">${report.severity || 'Unknown'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Description:</span>
                            <span class="info-value">${escapeHtml(report.description || 'No description provided').substring(0, 200)}${report.description?.length > 200 ? '...' : ''}</span>
                        </div>
                    </div>
                </div>
                
                <div class="report-actions">
                    <button class="btn-action btn-info" onclick="viewReportDetails(${report.id})" title="View full details">
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

    reportsList.innerHTML = reportsHTML;
}

// View report details in modal
async function viewReportDetails(reportId) {
    console.log('👁️ Viewing report details for ID:', reportId);
    
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
            const report = data.report;
            
            // Create modal content
            const modalContent = `
                <div class="modal-header">
                    <h2>📋 Report Details</h2>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="report-details">
                        <div class="detail-row">
                            <strong>🎯 Vulnerability:</strong> ${escapeHtml(report.vulnerability_title || 'Unknown')}
                        </div>
                        <div class="detail-row">
                            <strong>👤 Reporter:</strong> ${escapeHtml(report.username || 'Unknown')}
                        </div>
                        <div class="detail-row">
                            <strong>📊 Status:</strong> <span class="${getStatusClass(report.status)}">${getStatusText(report.status)}</span>
                        </div>
                        <div class="detail-row">
                            <strong>⚠️ Severity:</strong> <span class="severity-${(report.severity || 'unknown').toLowerCase()}">${report.severity || 'Unknown'}</span>
                        </div>
                        <div class="detail-row">
                            <strong>💎 Points:</strong> ${report.points || 0}
                        </div>
                        <div class="detail-row">
                            <strong>📅 Submitted:</strong> ${formatDate(report.created_at)}
                        </div>
                        <div class="detail-section">
                            <strong>📝 Description:</strong>
                            <p class="detail-text">${escapeHtml(report.description || 'No description provided')}</p>
                        </div>
                        ${report.proof_of_concept ? `
                            <div class="detail-section">
                                <strong>🔬 Proof of Concept:</strong>
                                <p class="detail-text">${escapeHtml(report.proof_of_concept)}</p>
                            </div>
                        ` : ''}
                        ${report.impact ? `
                            <div class="detail-section">
                                <strong>💥 Impact:</strong>
                                <p class="detail-text">${escapeHtml(report.impact)}</p>
                            </div>
                        ` : ''}
                        ${report.mitigation ? `
                            <div class="detail-section">
                                <strong>🛡️ Mitigation:</strong>
                                <p class="detail-text">${escapeHtml(report.mitigation)}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            // Show modal
            showModal('Report Details', modalContent);
        } else {
            throw new Error(data.message || 'Failed to load report details');
        }
    } catch (error) {
        console.error('❌ Error loading report details:', error);
        showNotification(`❌ ${error.message}`, 'error');
    }
}

// Show modal with content
function showModal(title, content) {
    let modal = document.getElementById('dynamicModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dynamicModal';
        modal.className = 'modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            overflow: auto;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background-color: var(--card-bg, #1a1a1a);
            margin: 5% auto;
            padding: 0;
            border: 1px solid var(--border-color, #333);
            border-radius: 12px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            color: var(--text-primary, #fff);
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = content;
    
    // Setup close button
    const closeBtn = modalContent.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    modal.style.display = 'block';
}

// Delete report
async function deleteReport(reportId) {
    console.log('🗑️ Attempting to delete report:', reportId);
    
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
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('📨 Delete response:', { status: response.status, success: data.success });

        if (response.ok && data.success) {
            console.log('✅ Report deleted successfully');
            showNotification('✅ Report deleted successfully', 'success');
            await loadReports(); // Reload to update the list
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
    console.log('✅ Attempting to resolve report:', reportId);
    
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

// View report details modal
function viewReportDetails(reportId) {
    console.log('👁️ Opening report details modal for:', reportId);
    // This function is already implemented above
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
    console.log('🔍 Viewing vulnerability:', vulnerabilityId);
    const vulnerability = allVulnerabilities.find(v => v.id == vulnerabilityId);
    
    if (vulnerability) {
        const modalContent = `
            <div class="modal-header">
                <h2>🎯 Vulnerability Details</h2>
                <span class="modal-close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="vulnerability-details">
                    <div class="detail-row">
                        <strong>📋 Title:</strong> ${escapeHtml(vulnerability.title)}
                    </div>
                    <div class="detail-row">
                        <strong>⚠️ Severity:</strong> <span class="severity-${vulnerability.severity.toLowerCase()}">${vulnerability.severity}</span>
                    </div>
                    <div class="detail-row">
                        <strong>💎 Points:</strong> ${vulnerability.points}
                    </div>
                    <div class="detail-row">
                        <strong>🏷️ Category:</strong> ${escapeHtml(vulnerability.category || 'Unknown')}
                    </div>
                    <div class="detail-section">
                        <strong>📝 Description:</strong>
                        <p class="detail-text">${escapeHtml(vulnerability.description)}</p>
                    </div>
                    ${vulnerability.hints ? `
                        <div class="detail-section">
                            <strong>💡 Hints:</strong>
                            <p class="detail-text">${escapeHtml(vulnerability.hints)}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        showModal('Vulnerability Details', modalContent);
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
    // Check if global showNotification exists and is different from this function
    if (window.showNotification && window.showNotification !== showNotification && typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    // Remove existing notifications to avoid stacking
    const existingNotifications = document.querySelectorAll('.report-notification');
    existingNotifications.forEach(notif => notif.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'report-notification';
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
        font-family: Arial, sans-serif;
        font-size: 14px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 5000);
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
window.updateVulnerabilityInfo = updateVulnerabilityInfo;
window.handleReportSubmit = handleReportSubmit;

console.log('📦 Reports.js loaded successfully');