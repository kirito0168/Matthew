// Reports Page JavaScript - Complete Version with Vulnerability Selection
// This file handles reports functionality with vulnerability selection

let selectedRating = 0;
let currentPage = 1;
const itemsPerPage = 10;
let editingReviewId = null;
let allReports = [];
let availableVulnerabilities = [];
let selectedVulnerability = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    await checkAuth();
    
    // Load initial data
    await loadPageData();

    // Setup event listeners
    setupEventListeners();
    
    // Setup star rating for reviews page (backward compatibility)
    setupStarRating();
});

function setupEventListeners() {
    // Report form handler
    const createReportForm = document.getElementById('createReportForm');
    if (createReportForm) {
        createReportForm.addEventListener('submit', handleCreateReport);
    }
    
    // Review form handler (backward compatibility)
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }

    // Setup modal close on outside click
    window.onclick = function(event) {
        const reviewModal = document.getElementById('reviewModal');
        const createModal = document.getElementById('createReportModal');
        const detailsModal = document.getElementById('reportDetailsModal');
        
        if (event.target === reviewModal) {
            closeReviewModal();
        }
        if (event.target === createModal) {
            closeCreateReportModal();
        }
        if (event.target === detailsModal) {
            closeReportDetailsModal();
        }
    }
}

async function loadPageData() {
    // Check which page we're on and load appropriate data
    const reportsList = document.getElementById('reportsList');
    const reviewsList = document.getElementById('reviewsList');
    
    if (reportsList) {
        // We're on the reports page
        await loadReports();
        await loadAvailableVulnerabilities();
    } else if (reviewsList) {
        // We're on the reviews page
        await loadReviews();
    }
}

// ===================== VULNERABILITY LOADING =====================

async function loadAvailableVulnerabilities() {
    try {
        // Load all open vulnerabilities that can be reported on
        const response = await fetch(`${API_URL}/vulnerabilities?status=open&limit=100`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            availableVulnerabilities = data.vulnerabilities || [];
            populateVulnerabilitySelect();
        }
    } catch (error) {
        console.error('Error loading vulnerabilities:', error);
    }
}

function populateVulnerabilitySelect() {
    const select = document.getElementById('vulnerabilitySelect');
    if (!select) return;

    // Clear existing options except the first one
    select.innerHTML = '<option value="">-- Select a vulnerability to report --</option>';

    // Group vulnerabilities by severity
    const grouped = {
        critical: [],
        high: [],
        medium: [],
        low: []
    };

    availableVulnerabilities.forEach(vuln => {
        if (vuln.status === 'open' || vuln.status === 'in_progress') {
            grouped[vuln.severity]?.push(vuln);
        }
    });

    // Add vulnerabilities by severity groups
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
        if (grouped[severity].length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = `${severity.toUpperCase()} Severity`;
            
            grouped[severity].forEach(vuln => {
                const option = document.createElement('option');
                option.value = vuln.id;
                option.textContent = `#${vuln.id} - ${vuln.title} (+${vuln.exp_reward} EXP)`;
                option.dataset.vulnerability = JSON.stringify(vuln);
                optgroup.appendChild(option);
            });
            
            select.appendChild(optgroup);
        }
    });
}

function updateVulnerabilityDetails() {
    const select = document.getElementById('vulnerabilitySelect');
    const preview = document.getElementById('vulnerabilityPreview');
    
    if (!select || !preview) return;

    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedOption && selectedOption.value) {
        selectedVulnerability = JSON.parse(selectedOption.dataset.vulnerability);
        
        // Update preview
        document.getElementById('previewId').textContent = `#${selectedVulnerability.id}`;
        document.getElementById('previewTitle').textContent = selectedVulnerability.title;
        document.getElementById('previewSeverity').innerHTML = `<span class="severity-badge severity-${selectedVulnerability.severity}">${selectedVulnerability.severity.toUpperCase()}</span>`;
        document.getElementById('previewStatus').innerHTML = `<span class="status-badge status-${selectedVulnerability.status}">${formatStatus(selectedVulnerability.status)}</span>`;
        document.getElementById('previewExp').textContent = `+${selectedVulnerability.exp_reward} EXP`;
        document.getElementById('previewDescription').textContent = selectedVulnerability.description;
        
        preview.style.display = 'block';
    } else {
        selectedVulnerability = null;
        preview.style.display = 'none';
    }
}

// ===================== REPORTS FUNCTIONALITY =====================

async function loadReports() {
    const reportsList = document.getElementById('reportsList');
    reportsList.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const statusFilter = document.getElementById('statusFilter')?.value;
        let url = `${API_URL}/reports?page=${currentPage}&limit=${itemsPerPage}`;
        
        if (statusFilter !== '') {
            url += `&status=${statusFilter}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            allReports = data.reports || [];
            displayReports(allReports);
            displayPagination(data.pagination || {});
            updateReportStats(allReports);
        } else {
            throw new Error('Failed to load reports');
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        reportsList.innerHTML = '<p class="error">Error loading reports. Please try again later.</p>';
        updateReportStats([]);
    }
}

function displayReports(reports) {
    const reportsList = document.getElementById('reportsList');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    if (!reports || reports.length === 0) {
        reportsList.innerHTML = '<p class="no-data">No reports found. Create your first report!</p>';
        return;
    }

    reportsList.innerHTML = reports.map(report => {
        const statusText = report.status === 0 ? 'Open' : 'Closed';
        const statusClass = report.status === 0 ? 'status-open' : 'status-closed';
        const isOwner = currentUser.id === report.user_id;
        
        return `
            <div class="report-card">
                <div class="report-header">
                    <div class="report-title-row">
                        <span class="report-id">Report #${report.id}</span>
                        <span class="vulnerability-id">Vulnerability #${report.vulnerability_id}</span>
                        <h3 class="report-title">${escapeHtml(report.vulnerability_title || 'Vulnerability Report')}</h3>
                    </div>
                    <div class="report-meta">
                        <span class="report-status ${statusClass}">${statusText}</span>
                        <span class="report-severity severity-${report.vulnerability_severity || 'medium'}">
                            ${(report.vulnerability_severity || 'medium').toUpperCase()}
                        </span>
                        <span class="report-points">+${report.vulnerability_points || 0} EXP</span>
                    </div>
                </div>
                <div class="report-body">
                    ${report.report_summary ? `
                        <div class="report-summary">
                            <strong>Report Summary:</strong>
                            <p>${escapeHtml(report.report_summary).substring(0, 300)}${report.report_summary.length > 300 ? '...' : ''}</p>
                        </div>
                    ` : ''}
                    <div class="report-info">
                        <span><i class="icon-user"></i> Reported by: ${report.username || 'Unknown'}</span>
                        <span><i class="icon-star"></i> Reputation: ${report.user_reputation || 0}</span>
                        <span><i class="icon-clock"></i> ${formatDate(report.created_at)}</span>
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn-action btn-view" onclick="viewReportDetails(${report.id})">
                        <i class="icon-eye"></i> View Details
                    </button>
                    <button class="btn-action btn-vulnerability" onclick="window.location.href='/vulnerabilities.html#${report.vulnerability_id}'">
                        <i class="icon-bug"></i> View Vulnerability
                    </button>
                    ${report.status === 0 && isOwner ? `
                        <button class="btn-action btn-edit" onclick="editReportSummary(${report.id}, '${escapeHtml(report.report_summary || '').replace(/'/g, "\\'")}')">
                            <i class="icon-edit"></i> Edit Summary
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function updateReportStats(reports) {
    const totalReports = document.getElementById('totalReports');
    const openReports = document.getElementById('openReports');
    const closedReports = document.getElementById('closedReports');
    
    if (totalReports) totalReports.textContent = reports.length;
    if (openReports) openReports.textContent = reports.filter(r => r.status === 0).length;
    if (closedReports) closedReports.textContent = reports.filter(r => r.status === 1).length;
}

function searchReports() {
    const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
    
    if (!searchTerm) {
        displayReports(allReports);
        return;
    }
    
    const filteredReports = allReports.filter(report => {
        const vulnId = report.vulnerability_id.toString();
        const title = (report.vulnerability_title || '').toLowerCase();
        const summary = (report.report_summary || '').toLowerCase();
        const username = (report.username || '').toLowerCase();
        
        return vulnId.includes(searchTerm) || 
               title.includes(searchTerm) || 
               summary.includes(searchTerm) ||
               username.includes(searchTerm);
    });
    
    displayReports(filteredReports);
}

// Report Modal functions
async function openCreateReportModal() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
        showNotification('Please login to create a report', 'error');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
        return;
    }

    // Load fresh vulnerability list
    await loadAvailableVulnerabilities();
    
    document.getElementById('createReportModal').style.display = 'block';
    document.getElementById('vulnerabilityPreview').style.display = 'none';
}

function closeCreateReportModal() {
    document.getElementById('createReportModal').style.display = 'none';
    document.getElementById('createReportForm').reset();
    document.getElementById('vulnerabilityPreview').style.display = 'none';
    selectedVulnerability = null;
}

async function handleCreateReport(e) {
    e.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
        showNotification('Please login to create a report', 'error');
        return;
    }

    const vulnerabilityId = document.getElementById('vulnerabilitySelect').value;
    const reportSummary = document.getElementById('reportSummary').value;

    if (!vulnerabilityId) {
        showNotification('Please select a vulnerability', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: user.id,
                vulnerability_id: parseInt(vulnerabilityId),
                report_summary: reportSummary
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(`Report created successfully for vulnerability #${vulnerabilityId}!`, 'success');
            closeCreateReportModal();
            loadReports();
        } else {
            showNotification(data.message || 'Failed to create report', 'error');
        }
    } catch (error) {
        console.error('Create report error:', error);
        showNotification('Failed to create report', 'error');
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

        const data = await response.json();

        if (response.ok && data.report) {
            displayReportDetails(data.report);
        } else {
            detailsDiv.innerHTML = '<div class="error">Failed to load report details</div>';
        }
    } catch (error) {
        console.error('Error loading report details:', error);
        detailsDiv.innerHTML = '<div class="error">Failed to load report details</div>';
    }
}

function displayReportDetails(report) {
    const detailsDiv = document.getElementById('reportDetails');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const statusText = report.status === 0 ? 'Open' : 'Closed';
    const statusClass = report.status === 0 ? 'status-open' : 'status-closed';
    const isOwner = currentUser.id === report.user_id;
    
    detailsDiv.innerHTML = `
        <div class="detail-section">
            <h3>Report Information</h3>
            <div class="detail-ids">
                <span class="detail-report-id">Report ID: #${report.id}</span>
                <span class="detail-vuln-id">Vulnerability ID: #${report.vulnerability_id}</span>
            </div>
            <div class="detail-meta">
                <span class="report-status ${statusClass}">${statusText}</span>
                <span class="vuln-severity severity-${report.vulnerability_severity || 'medium'}">
                    ${(report.vulnerability_severity || 'medium').toUpperCase()}
                </span>
                <span class="vuln-points">+${report.vulnerability_points || 0} EXP</span>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Vulnerability Details</h3>
            <div class="detail-info">
                <p><strong>Title:</strong> ${escapeHtml(report.vulnerability_title || 'N/A')}</p>
                <p><strong>Description:</strong> ${escapeHtml(report.vulnerability_description || 'N/A')}</p>
                <p><strong>Severity:</strong> <span class="severity-badge severity-${report.vulnerability_severity}">${(report.vulnerability_severity || 'medium').toUpperCase()}</span></p>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Report Summary</h3>
            <div class="report-summary-detail">
                ${report.report_summary ? `<p>${escapeHtml(report.report_summary).replace(/\n/g, '<br>')}</p>` : '<p>No summary provided</p>'}
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Report Metadata</h3>
            <div class="detail-info">
                <p><strong>Reported by:</strong> ${report.username || 'Unknown'}</p>
                <p><strong>User Reputation:</strong> ${report.user_reputation || 0}</p>
                <p><strong>Created:</strong> ${formatDate(report.created_at)}</p>
                ${report.updated_at ? `<p><strong>Updated:</strong> ${formatDate(report.updated_at)}</p>` : ''}
                ${report.closer_username ? `<p><strong>Closed by:</strong> ${report.closer_username}</p>` : ''}
            </div>
        </div>
        
        <div class="detail-actions">
            <button class="btn-primary" onclick="window.location.href='/vulnerabilities.html#${report.vulnerability_id}'">
                View Vulnerability
            </button>
            ${isOwner && report.status === 0 ? `
                <button class="btn-secondary" onclick="editReportSummary(${report.id}, '${escapeHtml(report.report_summary || '').replace(/'/g, "\\'")}')">
                    Edit Summary
                </button>
            ` : ''}
            <button class="btn-secondary" onclick="closeReportDetailsModal()">Close</button>
        </div>
    `;
}

function closeReportDetailsModal() {
    document.getElementById('reportDetailsModal').style.display = 'none';
}

async function editReportSummary(reportId, currentSummary) {
    const newSummary = prompt('Edit report summary:', currentSummary || '');
    
    if (newSummary === null || newSummary === currentSummary) return;
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
        showNotification('Please login to edit a report', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/reports/${reportId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                report_summary: newSummary,
                user_id: user.id,
                status: 0 // Keep status as open
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Report summary updated successfully!', 'success');
            loadReports();
            // If details modal is open, refresh it
            if (document.getElementById('reportDetailsModal')?.style.display === 'block') {
                viewReportDetails(reportId);
            }
        } else {
            showNotification(data.message || 'Failed to update report summary', 'error');
        }
    } catch (error) {
        console.error('Update report error:', error);
        showNotification('Failed to update report summary', 'error');
    }
}

// ===================== REVIEWS FUNCTIONALITY (Backward Compatibility) =====================

async function loadReviews() {
    const reviewsList = document.getElementById('reviewsList');
    reviewsList.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch(`${API_URL}/reviews?page=${currentPage}&limit=${itemsPerPage}`);

        if (response.ok) {
            const data = await response.json();
            displayReviews(data.reviews || []);
            displayPagination(data.pagination || {});
            const avgRating = data.averageRating || data.average || 0;
            const totalCount = (data.pagination && data.pagination.total) || 0;
            updateReviewStats(totalCount, avgRating);
        } else {
            throw new Error('Failed to load reviews');
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        reviewsList.innerHTML = '<p class="error">Error loading reviews. Please try again later.</p>';
        updateReviewStats(0, 0);
    }
}

function displayReviews(reviews) {
    const reviewsList = document.getElementById('reviewsList');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    if (!reviews || reviews.length === 0) {
        reviewsList.innerHTML = '<p class="no-data">No reviews yet. Be the first to share your experience!</p>';
        return;
    }

    reviewsList.innerHTML = reviews.map(review => {
        const isOwner = currentUser.id === review.user_id;
        const userInitial = review.username ? review.username.charAt(0).toUpperCase() : '?';
        
        return `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-user">
                        <div class="user-avatar">${userInitial}</div>
                        <div class="user-info">
                            <h3 class="user-name">${escapeHtml(review.username || 'Anonymous')}</h3>
                            <span class="user-level">Level ${review.user_level || 1}</span>
                        </div>
                    </div>
                    <div class="review-meta">
                        <div class="review-date">${formatDate(review.created_at)}</div>
                        <div class="review-rating">
                            ${generateStars(review.rating)}
                        </div>
                    </div>
                </div>
                ${review.vulnerability_id ? `
                    <div class="review-vulnerability">
                        <span class="vuln-badge">Vulnerability #${review.vulnerability_id}</span>
                    </div>
                ` : ''}
                ${review.comment ? `
                    <div class="review-content">
                        <p class="review-comment">${escapeHtml(review.comment)}</p>
                    </div>
                ` : ''}
                ${isOwner ? `
                    <div class="review-actions">
                        <button class="btn-edit" onclick="editReview(${review.id}, ${review.rating}, '${escapeHtml(review.comment || '').replace(/'/g, "\\'")}')">Edit</button>
                        <button class="btn-delete" onclick="deleteReview(${review.id})">Delete</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function updateReviewStats(total, average) {
    const totalReviews = document.getElementById('totalReviews');
    const averageRating = document.getElementById('averageRating');
    
    if (totalReviews) {
        totalReviews.textContent = total || 0;
    }
    
    if (averageRating) {
        const avgValue = (average !== null && average !== undefined && !isNaN(average)) 
            ? parseFloat(average).toFixed(1) 
            : '0.0';
        averageRating.textContent = avgValue;
    }
}

// Star rating and review functions...
function setupStarRating() {
    const starContainer = document.getElementById('starRating');
    if (!starContainer) return;
    
    const stars = starContainer.querySelectorAll('.star');
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            updateStarDisplay(selectedRating);
        });
        
        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.dataset.rating);
            updateStarDisplay(rating, true);
        });
    });
    
    starContainer.addEventListener('mouseleave', () => {
        updateStarDisplay(selectedRating);
    });
}

function updateStarDisplay(rating, isHover = false) {
    const stars = document.querySelectorAll('#starRating .star');
    stars.forEach(star => {
        const starRating = parseInt(star.dataset.rating);
        if (starRating <= rating) {
            star.classList.add('filled');
            star.classList.remove('empty');
        } else {
            star.classList.remove('filled');
            star.classList.add('empty');
        }
    });
    
    const ratingDisplay = document.getElementById('ratingDisplay');
    if (ratingDisplay && !isHover) {
        const ratingText = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        ratingDisplay.textContent = rating > 0 ? `${rating}/5 - ${ratingText[rating]}` : '';
    }
}

function openReviewModal() {
    editingReviewId = null;
    selectedRating = 0;
    updateStarDisplay(0);
    
    const modal = document.getElementById('reviewModal');
    if (modal) modal.style.display = 'block';
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) modal.style.display = 'none';
    
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) reviewForm.reset();
    
    selectedRating = 0;
    updateStarDisplay(0);
    editingReviewId = null;
}

async function handleReviewSubmit(e) {
    e.preventDefault();

    if (selectedRating === 0) {
        showNotification('Please select a rating', 'error');
        return;
    }

    const comment = document.getElementById('reviewComment')?.value.trim();
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login to submit a review', 'error');
            return;
        }

        const url = editingReviewId ? 
            `${API_URL}/reviews/${editingReviewId}` : 
            `${API_URL}/reviews`;
        
        const method = editingReviewId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                rating: selectedRating,
                comment: comment || null,
                vulnerabilityId: null
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(
                editingReviewId ? 'Review updated successfully!' : 'Review submitted successfully!', 
                'success'
            );
            closeReviewModal();
            await loadReviews();
        } else {
            throw new Error(data.message || 'Failed to submit review');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification(error.message || 'Error submitting review', 'error');
    }
}

async function editReview(reviewId, rating, comment) {
    editingReviewId = reviewId;
    selectedRating = rating;
    updateStarDisplay(rating);
    
    const reviewComment = document.getElementById('reviewComment');
    if (reviewComment) reviewComment.value = comment || '';
    
    const modal = document.getElementById('reviewModal');
    if (modal) modal.style.display = 'block';
}

async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showNotification('Review deleted successfully!', 'success');
            await loadReviews();
        } else {
            const data = await response.json();
            throw new Error(data.message || 'Failed to delete review');
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        showNotification(error.message || 'Error deleting review', 'error');
    }
}

// ===================== SHARED FUNCTIONALITY =====================

// Pagination
function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    
    if (!pagination || pagination.totalPages <= 1) {
        if (paginationDiv) paginationDiv.innerHTML = '';
        return;
    }

    let html = '<div class="pagination-controls">';
    
    // Previous button
    if (pagination.page > 1) {
        html += `<button class="page-btn" onclick="changePage(${pagination.page - 1})">Previous</button>`;
    }

    // Page numbers
    const maxPages = 5;
    const startPage = Math.max(1, pagination.page - Math.floor(maxPages / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxPages - 1);

    for (let i = startPage; i <= endPage; i++) {
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
    if (paginationDiv) paginationDiv.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadPageData();
    window.scrollTo(0, 0);
}

// Utility functions
function formatStatus(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<span class="star ${i <= rating ? '' : 'empty'}">⭐</span>`;
    }
    return stars;
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
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
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

// Export functions to global scope
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.openCreateReportModal = openCreateReportModal;
window.closeCreateReportModal = closeCreateReportModal;
window.closeReportDetailsModal = closeReportDetailsModal;
window.viewReportDetails = viewReportDetails;
window.editReportSummary = editReportSummary;
window.editReview = editReview;
window.deleteReview = deleteReview;
window.changePage = changePage;
window.searchReports = searchReports;
window.updateVulnerabilityDetails = updateVulnerabilityDetails;