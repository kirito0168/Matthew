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
            gridDiv.innerHTML = '<div class="empty-state"><h3>No Vulnerabilities Found</h3><p>Be the first to report a vulnerability!</p></div>';
            const paginationDiv = document.getElementById('pagination');
            if (paginationDiv) {
                paginationDiv.innerHTML = '';
            }
        }
    } catch (error) {
        console.error('Error loading vulnerabilities:', error);
        gridDiv.innerHTML = '<div class="empty-state"><h3>Error Loading Data</h3><p>Failed to load vulnerabilities. Please try again.</p></div>';
    }
}

function displayVulnerabilities(vulnerabilities) {
    const gridDiv = document.getElementById('vulnerabilitiesGrid');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    gridDiv.innerHTML = vulnerabilities.map(vuln => {
        const canResolve = (vuln.status === 'open' || vuln.status === 'in_progress') && vuln.reporter_id !== currentUser.id;
        const isReporter = vuln.reporter_id === currentUser.id;
        
        return `
            <div class="vuln-card">
                <div class="vuln-header">
                    <h3 class="vuln-title">${escapeHtml(vuln.title)}</h3>
                    <div class="vuln-meta">
                        <span class="vuln-severity severity-${vuln.severity}">${vuln.severity.toUpperCase()}</span>
                        <span class="vuln-status status-${vuln.status.replace('_', '-')}">${formatStatus(vuln.status)}</span>
                        <span class="vuln-exp">+${vuln.exp_reward || 100} EXP</span>
                    </div>
                </div>
                <div class="vuln-body">
                    <p class="vuln-description">${escapeHtml(vuln.description).substring(0, 200)}${vuln.description.length > 200 ? '...' : ''}</p>
                    <div class="vuln-info">
                        <span>Reported by: ${vuln.reporter_name || 'Unknown'}</span>
                        <span>${formatDate(vuln.created_at)}</span>
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
    
    const formData = {
        title: document.getElementById('vulnTitle').value,
        description: document.getElementById('vulnDescription').value,
        severity: document.getElementById('vulnSeverity').value,
        category: document.getElementById('vulnCategory').value,
        steps_to_reproduce: document.getElementById('vulnSteps').value,
        impact: document.getElementById('vulnImpact').value
    };

    try {
        const response = await fetch(`${API_URL}/vulnerabilities`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Vulnerability reported successfully! +' + (data.exp_earned || 100) + ' EXP', 'success');
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

function submitReport(event) {
    handleReportSubmit(event);
}

// View details
async function viewDetails(id) {
    // For now, redirect to reports page
    window.location.href = `/reports.html?vulnerability_id=${id}`;
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
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: 'resolved' })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(`Vulnerability resolved! +${data.exp_earned || 100} EXP earned!`, 'success');
            loadVulnerabilities();
        } else {
            showNotification(data.message || 'Failed to resolve vulnerability', 'error');
        }
    } catch (error) {
        console.error('Resolve error:', error);
        showNotification('Failed to resolve vulnerability', 'error');
    }
}

// Pagination functions
function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    
    if (!paginationDiv) return;
    
    if (!pagination || pagination.totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let html = '<div class="pagination-controls">';
    
    // Previous button
    if (pagination.page > 1) {
        html += `<button class="page-btn" onclick="changePage(${pagination.page - 1})">Previous</button>`;
    }

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        html += `<button class="page-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            html += `<span class="page-dots">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === pagination.page) {
            html += `<span class="page-current">${i}</span>`;
        } else {
            html += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
        }
    }

    if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) {
            html += `<span class="page-dots">...</span>`;
        }
        html += `<button class="page-btn" onclick="changePage(${pagination.totalPages})">${pagination.totalPages}</button>`;
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Utility functions
function formatStatus(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
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
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
        const years = Math.floor(diffDays / 365);
        return years === 1 ? '1 year ago' : `${years} years ago`;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles if not already present
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.innerHTML = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem 1.5rem;
                background: rgba(0, 0, 0, 0.9);
                border-radius: 8px;
                color: white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                border-left: 4px solid var(--accent-color);
            }
            
            .notification-success .notification-content {
                border-left-color: #10b981;
            }
            
            .notification-error .notification-content {
                border-left-color: #ef4444;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0;
                margin-left: auto;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Manual close
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}