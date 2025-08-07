// Vulnerabilities page functionality - Complete with Reports Display and Resolution
let currentPage = 1;
let currentTab = 'all';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadVulnerabilities();
    setupEventListeners();
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
    // Changed from 'vulnerabilitiesList' to 'vulnerabilitiesGrid' to match HTML
    const gridDiv = document.getElementById('vulnerabilitiesGrid');
    
    if (!gridDiv) {
        console.error('Vulnerabilities grid element not found');
        return;
    }
    
    gridDiv.innerHTML = '<div class="loading-spinner"></div>';

    try {
        let url = `${API_URL}/vulnerabilities?page=${currentPage}&limit=10`;
        
        // Add filters
        const severityFilter = document.getElementById('severityFilter')?.value;
        const statusFilter = document.getElementById('statusFilter')?.value;
        const sortFilter = document.getElementById('sortFilter')?.value;
        
        if (severityFilter) url += `&severity=${severityFilter}`;
        if (statusFilter) url += `&status=${statusFilter}`;
        if (sortFilter) url += `&sort=${sortFilter}`;

        // Add tab filter
        if (currentTab === 'my-reports' || currentTab === 'my-resolved') {
            const token = localStorage.getItem('token');
            if (!token) {
                gridDiv.innerHTML = '<div class="empty-state"><h3>Authentication Required</h3><p>Please login to view your reports</p></div>';
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
        const response = await fetch(`${API_URL}/vulnerabilities/${id}/resolve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
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
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }
            
            .notification-success .notification-content {
                border: 1px solid #4CAF50;
                background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(0, 0, 0, 0.9));
            }
            
            .notification-error .notification-content {
                border: 1px solid #F44336;
                background: linear-gradient(135deg, rgba(244, 67, 54, 0.1), rgba(0, 0, 0, 0.9));
            }
            
            .notification-info .notification-content {
                border: 1px solid var(--primary-color);
                background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 0, 0, 0.9));
            }
            
            .notification-message {
                color: white;
                font-size: 1rem;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
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
        `;
        document.head.appendChild(styles);
    }
    
    // Add to document
    document.body.appendChild(notification);
    
    // Close button functionality
    notification.querySelector('.notification-close').onclick = () => {
        notification.remove();
    };
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Check authentication
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        return null;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return null;
        }
        
        return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (error) {
        console.error('Auth check error:', error);
        return null;
    }
}

// Initialize API_URL if not defined
if (typeof API_URL === 'undefined') {
    window.API_URL = '/api';
}