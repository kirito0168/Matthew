// vulnerabilities.js - Fixed version with all utility functions

// Global variables
let currentPage = 1;
let currentLimit = 10;
let currentTab = 'all';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadVulnerabilities();
    setupEventListeners();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = '/login.html';
        return;
    }
}

function setupEventListeners() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            currentPage = 1;
            loadVulnerabilities();
        });
    });

    // Modal close events
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeReportModal();
            closeDetailsModal();
        }
    });

    // Report form submission
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }
}

// Load vulnerabilities
async function loadVulnerabilities() {
    const gridDiv = document.getElementById('vulnerabilitiesGrid');
    if (!gridDiv) return;

    gridDiv.innerHTML = '<div class="loading">Loading vulnerabilities...</div>';

    try {
        let url = `${API_URL}/vulnerabilities?page=${currentPage}&limit=${currentLimit}`;
        
        if (currentTab !== 'all') {
            if (currentTab === 'mine') {
                url += '&mine=true';
            } else if (currentTab === 'resolved') {
                url += '&status=resolved';
            } else if (currentTab === 'open') {
                url += '&status=open';
            } else {
                return;
            }
        }

        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { headers });
        const data = await response.json();

        if (response.ok && data.success) {
            displayVulnerabilities(data.vulnerabilities);
            updatePagination(data.pagination);
        } else {
            throw new Error(data.message || 'Failed to load vulnerabilities');
        }
    } catch (error) {
        console.error('Load vulnerabilities error:', error);
        gridDiv.innerHTML = '<div class="error">Failed to load vulnerabilities</div>';
        showNotification('Failed to load vulnerabilities', 'error');
    }
}

// Display vulnerabilities
function displayVulnerabilities(vulnerabilities) {
    const gridDiv = document.getElementById('vulnerabilitiesGrid');
    if (!gridDiv) return;

    if (!vulnerabilities || vulnerabilities.length === 0) {
        gridDiv.innerHTML = '<div class="no-data">No vulnerabilities found</div>';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const canResolve = user.role === 'admin' || user.role === 'moderator';

    gridDiv.innerHTML = vulnerabilities.map(vuln => {
        const severityClass = `severity-${vuln.severity.toLowerCase()}`;
        const statusClass = `status-${vuln.status.toLowerCase()}`;
        
        return `
            <div class="vuln-card ${statusClass}">
                <div class="vuln-header">
                    <h3 class="vuln-title">${escapeHtml(vuln.title)}</h3>
                    <div class="vuln-badges">
                        <span class="badge ${severityClass}">${vuln.severity}</span>
                        <span class="badge badge-status">${vuln.status}</span>
                        ${vuln.category ? `<span class="badge badge-category">${vuln.category}</span>` : ''}
                    </div>
                </div>
                <div class="vuln-content">
                    <p class="vuln-description">${escapeHtml(vuln.description?.substring(0, 150) + (vuln.description?.length > 150 ? '...' : ''))}</p>
                    <div class="vuln-info">
                        <span>Reported by: ${vuln.reporter_name || 'Unknown'}</span>
                        <span>${formatDate(vuln.created_at)}</span>
                        <span>EXP: ${vuln.exp_reward || 0}</span>
                    </div>
                </div>
                <div class="vuln-actions">
                    <button class="btn-action" onclick="viewDetails(${vuln.id})">View Details</button>
                    ${canResolve ? 
                        `<button class="btn-action btn-resolve" onclick="resolveVulnerability(${vuln.id})">Resolve</button>` : 
                        ''}
                </div>
            </div>
        `;
    }).join('');
}

// Update pagination
function updatePagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv || !pagination) return;

    const { page, totalPages, total } = pagination;
    
    let paginationHTML = `<div class="pagination-info">Page ${page} of ${totalPages} (${total} total)</div>`;
    
    if (totalPages > 1) {
        paginationHTML += '<div class="pagination-controls">';
        
        if (page > 1) {
            paginationHTML += `<button class="btn-pagination" onclick="changePage(1)">First</button>`;
            paginationHTML += `<button class="btn-pagination" onclick="changePage(${page - 1})">Previous</button>`;
        }
        
        // Show page numbers
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === page ? 'active' : '';
            paginationHTML += `<button class="btn-pagination ${activeClass}" onclick="changePage(${i})">${i}</button>`;
        }
        
        if (page < totalPages) {
            paginationHTML += `<button class="btn-pagination" onclick="changePage(${page + 1})">Next</button>`;
            paginationHTML += `<button class="btn-pagination" onclick="changePage(${totalPages})">Last</button>`;
        }
        
        paginationHTML += '</div>';
    }
    
    paginationDiv.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    currentPage = page;
    loadVulnerabilities();
}

// Modal functions
function openReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('reportForm')?.reset();
    }
}

function closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Submit report
async function handleReportSubmit(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Submit Report';
    
    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }

        const formData = {
            title: document.getElementById('vulnTitle').value.trim(),
            description: document.getElementById('vulnDescription').value.trim(),
            severity: document.getElementById('vulnSeverity').value,
            category: document.getElementById('vulnCategory').value,
            steps_to_reproduce: document.getElementById('vulnSteps').value.trim(),
            impact: document.getElementById('vulnImpact').value.trim()
        };

        // Validation
        if (!formData.title || formData.title.length < 5) {
            throw new Error('Title must be at least 5 characters long');
        }

        if (!formData.description || formData.description.length < 10) {
            throw new Error('Description must be at least 10 characters long');
        }

        if (!formData.severity) {
            throw new Error('Please select a severity level');
        }

        if (!formData.category) {
            throw new Error('Please select a category');
        }

        if (!formData.steps_to_reproduce || formData.steps_to_reproduce.length < 10) {
            throw new Error('Steps to reproduce must be at least 10 characters long');
        }

        if (!formData.impact || formData.impact.length < 10) {
            throw new Error('Impact description must be at least 10 characters long');
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('You must be logged in to submit a vulnerability report');
        }

        const response = await fetch(`${API_URL}/vulnerabilities`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification(`Vulnerability reported successfully! +${data.exp_earned || 100} EXP`, 'success');
            closeReportModal();
            loadVulnerabilities();
        } else {
            throw new Error(data.message || 'Failed to report vulnerability');
        }
    } catch (error) {
        console.error('Report error:', error);
        showNotification(error.message || 'Failed to submit report', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

function submitReport(event) {
    handleReportSubmit(event);
}

// View details
async function viewDetails(id) {
    try {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/vulnerabilities/${id}`, { headers });
        const data = await response.json();

        if (response.ok && data.success) {
            displayVulnerabilityDetails(data.vulnerability);
        } else {
            throw new Error(data.message || 'Failed to load vulnerability details');
        }
    } catch (error) {
        console.error('View details error:', error);
        showNotification('Failed to load vulnerability details', 'error');
    }
}

// Display vulnerability details in modal
function displayVulnerabilityDetails(vulnerability) {
    const modal = document.getElementById('detailsModal');
    if (!modal) return;

    const severityClass = `severity-${vulnerability.severity.toLowerCase()}`;
    const statusClass = `status-${vulnerability.status.toLowerCase()}`;

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${escapeHtml(vulnerability.title)}</h2>
                <span class="modal-close" onclick="closeDetailsModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="vuln-badges">
                    <span class="badge ${severityClass}">${vulnerability.severity}</span>
                    <span class="badge badge-status ${statusClass}">${vulnerability.status}</span>
                    ${vulnerability.category ? `<span class="badge badge-category">${vulnerability.category}</span>` : ''}
                </div>
                
                <div class="detail-section">
                    <h3>Description</h3>
                    <p>${escapeHtml(vulnerability.description)}</p>
                </div>
                
                ${vulnerability.steps_to_reproduce ? `
                <div class="detail-section">
                    <h3>Steps to Reproduce</h3>
                    <pre>${escapeHtml(vulnerability.steps_to_reproduce)}</pre>
                </div>
                ` : ''}
                
                ${vulnerability.impact ? `
                <div class="detail-section">
                    <h3>Impact</h3>
                    <p>${escapeHtml(vulnerability.impact)}</p>
                </div>
                ` : ''}
                
                <div class="detail-section">
                    <h3>Information</h3>
                    <div class="info-grid">
                        <div><strong>Reported by:</strong> ${vulnerability.reporter_name || 'Unknown'}</div>
                        <div><strong>Reported on:</strong> ${formatDate(vulnerability.created_at)}</div>
                        <div><strong>EXP Reward:</strong> ${vulnerability.exp_reward || 0}</div>
                        ${vulnerability.resolver_name ? `<div><strong>Resolved by:</strong> ${vulnerability.resolver_name}</div>` : ''}
                        ${vulnerability.updated_at !== vulnerability.created_at ? `<div><strong>Last updated:</strong> ${formatDate(vulnerability.updated_at)}</div>` : ''}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeDetailsModal()">Close</button>
                <button class="btn-primary" onclick="window.location.href='/reports.html?vulnerability_id=${vulnerability.id}'">Submit Report</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Resolve vulnerability
async function resolveVulnerability(id) {
    if (!confirm('Are you sure you want to mark this vulnerability as resolved?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('You must be logged in to resolve vulnerabilities');
        }

        const response = await fetch(`${API_URL}/vulnerabilities/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'resolved' })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Vulnerability marked as resolved!', 'success');
            loadVulnerabilities();
        } else {
            throw new Error(data.message || 'Failed to resolve vulnerability');
        }
    } catch (error) {
        console.error('Resolve vulnerability error:', error);
        showNotification(error.message || 'Failed to resolve vulnerability', 'error');
    }
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (error) {
        return 'Invalid date';
    }
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('vulnerabilitySearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
}

function handleSearch(event) {
    const searchTerm = event.target.value.trim();
    if (searchTerm.length < 3 && searchTerm.length > 0) {
        return; // Don't search for very short terms
    }
    
    currentPage = 1;
    loadVulnerabilities(searchTerm);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Filter functionality
function applyFilters() {
    const severityFilter = document.getElementById('severityFilter')?.value;
    const categoryFilter = document.getElementById('categoryFilter')?.value;
    const statusFilter = document.getElementById('statusFilter')?.value;
    
    currentPage = 1;
    loadVulnerabilities('', { severity: severityFilter, category: categoryFilter, status: statusFilter });
}

function clearFilters() {
    const severityFilter = document.getElementById('severityFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('vulnerabilitySearch');
    
    if (severityFilter) severityFilter.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (searchInput) searchInput.value = '';
    
    currentPage = 1;
    loadVulnerabilities();
}

// Initialize search and filters when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
});