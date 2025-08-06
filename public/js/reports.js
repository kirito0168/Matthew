// Reports/Reviews JavaScript - Complete Fixed Version

let selectedRating = 0;
let currentPage = 1;
const itemsPerPage = 10;
let editingReviewId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Update navigation first
    await updateNavigation();
    
    // Check if user is logged in but don't require auth for viewing
    const user = await checkAuth();
    
    // Load reviews
    await loadReports();

    // Setup star rating if user is logged in
    if (user) {
        setupStarRating();
        // Setup form handler
        document.getElementById('reviewForm').addEventListener('submit', handleReviewSubmit);
    } else {
        // Hide write review button if not logged in
        const writeButton = document.querySelector('.btn-primary');
        if (writeButton) {
            writeButton.style.display = 'none';
        }
    }
    
    // Add dynamic styles if not already added
    if (!document.getElementById('reports-dynamic-styles')) {
        addDynamicStyles();
    }
});

async function loadReports() {
    const reviewsList = document.getElementById('reviewsList');
    reviewsList.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch(`${API_URL}/reviews?page=${currentPage}&limit=${itemsPerPage}`);

        if (response.ok) {
            const data = await response.json();
            console.log('Reviews data:', data); // Debug log
            displayReviews(data.reviews);
            displayPagination(data.pagination);
            updateStats(data.pagination.total, data.averageRating);
        } else {
            throw new Error('Failed to load reviews');
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        reviewsList.innerHTML = '<p class="error">Error loading reviews. Please try again later.</p>';
    }
}

function displayReviews(reviews) {
    const reviewsList = document.getElementById('reviewsList');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    if (!reviews || reviews.length === 0) {
        reviewsList.innerHTML = '<p class="no-data">No reviews yet. Be the first to write one!</p>';
        return;
    }

    reviewsList.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="review-user">
                    <div class="user-avatar">
                        <img src="${review.avatar_url || '/img/default-avatar.png'}" alt="${review.username}">
                    </div>
                    <div class="user-info">
                        <h3 class="user-name">${escapeHtml(review.username)}</h3>
                        <div class="user-level">Level ${review.level}</div>
                    </div>
                </div>
                <div class="review-rating">
                    ${generateStars(review.rating)}
                </div>
            </div>
            <div class="review-body">
                <p class="review-comment">${escapeHtml(review.comment)}</p>
                ${review.vulnerability_title ? 
                    `<div class="review-context">Regarding: ${escapeHtml(review.vulnerability_title)}</div>` : 
                    ''}
                <div class="review-date">${formatDate(review.created_at)}</div>
            </div>
            ${currentUser.id === review.user_id ? `
                <div class="review-actions">
                    <button class="btn-action btn-edit" onclick="editReview(${review.id}, ${review.rating}, '${escapeHtml(review.comment).replace(/'/g, "\\'")}')">Edit</button>
                    <button class="btn-action btn-delete" onclick="deleteReview(${review.id})">Delete</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function updateStats(total, average) {
    // Update total reviews
    const totalElement = document.getElementById('totalReviews');
    if (totalElement) {
        totalElement.textContent = total || 0;
    }
    
    // Fix the toFixed error by ensuring average is a number
    const avgRating = parseFloat(average) || 0;
    
    // Try both possible element IDs for average rating
    const avgElement = document.getElementById('avgRating') || document.getElementById('averageRating');
    if (avgElement) {
        avgElement.textContent = avgRating.toFixed(1);
    }
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<span class="star ${i <= rating ? 'filled' : ''}">⭐</span>`;
    }
    return stars;
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

function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    
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
    paginationDiv.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadReports();
}

// Star rating setup - FIXED VERSION
function setupStarRating() {
    const starContainer = document.getElementById('starRating');
    if (!starContainer) return;
    
    const stars = starContainer.querySelectorAll('.star');
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            updateStarDisplay(selectedRating);
            // Show the selected rating value
            showRatingValue(selectedRating);
        });
        
        star.addEventListener('mouseenter', () => {
            const hoverRating = parseInt(star.dataset.rating);
            updateStarDisplay(hoverRating);
            showRatingValue(hoverRating);
        });
    });
    
    starContainer.addEventListener('mouseleave', () => {
        updateStarDisplay(selectedRating);
        if (selectedRating > 0) {
            showRatingValue(selectedRating);
        } else {
            hideRatingValue();
        }
    });
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('#starRating .star');
    stars.forEach(star => {
        const starRating = parseInt(star.dataset.rating);
        if (starRating <= rating) {
            star.classList.add('selected');
            star.style.filter = 'grayscale(0%)';
            star.style.opacity = '1';
        } else {
            star.classList.remove('selected');
            star.style.filter = 'grayscale(100%)';
            star.style.opacity = '0.5';
        }
    });
}

function showRatingValue(rating) {
    // Check if rating display exists, if not create it
    let ratingDisplay = document.getElementById('ratingDisplay');
    if (!ratingDisplay) {
        ratingDisplay = document.createElement('span');
        ratingDisplay.id = 'ratingDisplay';
        ratingDisplay.style.marginLeft = '1rem';
        ratingDisplay.style.color = 'var(--primary-color)';
        ratingDisplay.style.fontSize = '1.2rem';
        const starContainer = document.getElementById('starRating');
        if (starContainer && starContainer.parentNode) {
            starContainer.parentNode.insertBefore(ratingDisplay, starContainer.nextSibling);
        }
    }
    
    const ratingText = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    ratingDisplay.textContent = `${rating}/5 - ${ratingText[rating]}`;
}

function hideRatingValue() {
    const ratingDisplay = document.getElementById('ratingDisplay');
    if (ratingDisplay) {
        ratingDisplay.textContent = '';
    }
}

// Modal functions
async function openReviewModal() {
    // Check if user is logged in
    const user = await checkAuth();
    if (!user) {
        showNotification('Please login to write a review', 'error');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
        return;
    }

    const modal = document.getElementById('reviewModal');
    if (!modal) {
        console.error('Review modal not found');
        return;
    }
    
    modal.style.display = 'block';
    editingReviewId = null;
    selectedRating = 0;
    updateStarDisplay(0);
    
    const reviewComment = document.getElementById('reviewComment');
    if (reviewComment) {
        reviewComment.value = '';
    }
    
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'Write Your Review';
    }
    
    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
        submitButton.textContent = 'Submit Review';
    }
    
    hideRatingValue();
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.reset();
    }
    
    selectedRating = 0;
    updateStarDisplay(0);
    editingReviewId = null;
    hideRatingValue();
}

async function handleReviewSubmit(e) {
    e.preventDefault();

    if (selectedRating === 0) {
        showNotification('Please select a rating', 'error');
        return;
    }

    const comment = document.getElementById('reviewComment').value.trim();
    
    try {
        const token = localStorage.getItem('token');
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
                vulnerabilityId: null // General review
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(editingReviewId ? 'Review updated successfully!' : 'Review submitted successfully!', 'success');
            closeReviewModal();
            await loadReports();
        } else {
            throw new Error(data.message || 'Failed to submit review');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification(error.message || 'Error submitting review', 'error');
    }
}

async function editReview(reviewId, rating, comment) {
    const user = await checkAuth();
    if (!user) {
        showNotification('Please login to edit your review', 'error');
        return;
    }

    editingReviewId = reviewId;
    selectedRating = rating;
    updateStarDisplay(rating);
    showRatingValue(rating);
    
    const reviewComment = document.getElementById('reviewComment');
    if (reviewComment) {
        reviewComment.value = comment || '';
    }
    
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'Edit Your Review';
    }
    
    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
        submitButton.textContent = 'Update Review';
    }
    
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) {
        return;
    }

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
            await loadReports();
        } else {
            throw new Error('Failed to delete review');
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        showNotification('Error deleting review', 'error');
    }
}

// Notification function (if not already defined in main.js)
function showNotification(message, type = 'info') {
    // Check if function already exists from main.js
    if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
        return window.showNotification(message, type);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 4px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add dynamic styles
function addDynamicStyles() {
    const style = document.createElement('style');
    style.id = 'reports-dynamic-styles';
    style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loading-spinner {
        text-align: center;
        padding: 3rem;
    }
    
    .loading-spinner::after {
        content: '⚔️';
        display: inline-block;
        animation: spin 1s linear infinite;
        font-size: 2rem;
    }
    
    .no-data {
        text-align: center;
        color: var(--text-secondary);
        padding: 3rem;
        font-size: 1.1rem;
    }
    
    .error {
        text-align: center;
        color: #ff4444;
        padding: 2rem;
    }
    
    /* Inline star rating styles for modal */
    #starRating {
        display: flex;
        gap: 0.5rem;
        font-size: 2rem;
        align-items: center;
    }
    
    #starRating .star {
        cursor: pointer;
        transition: all 0.3s ease;
        user-select: none;
        display: inline-block;
    }
    
    #starRating .star:hover {
        transform: scale(1.2);
    }
    
    #starRating .star.selected {
        filter: grayscale(0%) !important;
        opacity: 1 !important;
        transform: scale(1.1);
    }
    
    #ratingDisplay {
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    `;
    document.head.appendChild(style);
}

// Export functions to global scope
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.editReview = editReview;
window.deleteReview = deleteReview;
window.changePage = changePage;