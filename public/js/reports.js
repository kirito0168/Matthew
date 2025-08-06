// Reports/Reviews JavaScript

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
    document.getElementById('totalReviews').textContent = total || 0;
    // Fix the toFixed error by ensuring average is a number
    const avgRating = parseFloat(average) || 0;
    document.getElementById('averageRating').textContent = avgRating.toFixed(1);
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

// Star rating setup
function setupStarRating() {
    const stars = document.querySelectorAll('#starRating .star');
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            selectedRating = index + 1;
            updateStarDisplay(selectedRating);
        });
        
        star.addEventListener('mouseenter', () => {
            updateStarDisplay(index + 1);
        });
    });
    
    document.getElementById('starRating').addEventListener('mouseleave', () => {
        updateStarDisplay(selectedRating);
    });
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('#starRating .star');
    stars.forEach((star, index) => {
        star.classList.toggle('selected', index < rating);
    });
}

// Modal functions
function openReviewModal() {
    document.getElementById('reviewModal').style.display = 'block';
    editingReviewId = null;
    selectedRating = 0;
    updateStarDisplay(0);
    document.getElementById('reviewComment').value = '';
    document.querySelector('.modal-title').textContent = 'Write Your Review';
    document.querySelector('.btn-submit').textContent = 'Submit Review';
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
    document.getElementById('reviewForm').reset();
    editingReviewId = null;
    selectedRating = 0;
    updateStarDisplay(0);
}

function editReview(id, rating, comment) {
    editingReviewId = id;
    selectedRating = rating;
    document.getElementById('reviewComment').value = comment;
    updateStarDisplay(rating);
    document.querySelector('.modal-title').textContent = 'Edit Your Review';
    document.querySelector('.btn-submit').textContent = 'Update Review';
    document.getElementById('reviewModal').style.display = 'block';
}

async function handleReviewSubmit(e) {
    e.preventDefault();

    if (selectedRating === 0) {
        showNotification('Please select a rating', 'error');
        return;
    }

    const comment = document.getElementById('reviewComment').value;
    
    try {
        const url = editingReviewId 
            ? `${API_URL}/reviews/${editingReviewId}`
            : `${API_URL}/reviews`;
            
        const method = editingReviewId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                rating: selectedRating, 
                comment 
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(editingReviewId ? 'Review updated successfully!' : 'Review submitted successfully!', 'success');
            closeReviewModal();
            loadReports();
        } else {
            throw new Error(data.message || 'Failed to submit review');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification(error.message || 'Error submitting review', 'error');
    }
}

async function deleteReview(id) {
    if (!confirm('Are you sure you want to delete this review?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/reviews/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            showNotification('Review deleted successfully!', 'success');
            loadReports();
        } else {
            throw new Error('Failed to delete review');
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        showNotification('Error deleting review', 'error');
    }
}

// Check if style element already exists before creating a new one
if (!document.getElementById('reports-styles')) {
    const style = document.createElement('style');
    style.id = 'reports-styles';
    style.textContent = `
    .reviews-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
        margin-top: 80px;
    }

    .reviews-header {
        text-align: center;
        margin-bottom: 3rem;
    }

    .reviews-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 2rem;
        margin-bottom: 3rem;
    }

    .stat-card {
        background: var(--card-bg);
        padding: 1.5rem;
        border-radius: 8px;
        text-align: center;
        border: 1px solid var(--border-color);
    }

    .stat-value {
        font-size: 2.5rem;
        font-weight: bold;
        color: var(--primary-color);
        margin-bottom: 0.5rem;
    }

    .stat-label {
        color: var(--text-secondary);
    }

    .reviews-list {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .review-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1.5rem;
        transition: all 0.3s ease;
    }

    .review-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 255, 255, 0.1);
    }

    .review-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .review-user {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .user-avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid var(--primary-color);
    }

    .user-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .user-name {
        color: var(--primary-color);
        margin: 0;
    }

    .user-level {
        color: var(--text-secondary);
        font-size: 0.9rem;
    }

    .review-rating {
        display: flex;
        gap: 0.25rem;
    }

    .star {
        color: #666;
        cursor: pointer;
        transition: color 0.2s;
    }

    .star.filled,
    .star.selected {
        color: #FFD700;
    }

    .review-comment {
        color: var(--text-primary);
        line-height: 1.6;
        margin-bottom: 1rem;
    }

    .review-context {
        color: var(--text-secondary);
        font-size: 0.9rem;
        font-style: italic;
        margin-top: 0.5rem;
    }

    .review-date {
        color: var(--text-secondary);
        font-size: 0.85rem;
    }

    .review-actions {
        margin-top: 1rem;
        display: flex;
        gap: 1rem;
    }

    .btn-action {
        padding: 0.5rem 1rem;
        background: transparent;
        border: 1px solid var(--primary-color);
        color: var(--primary-color);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .btn-action:hover {
        background: var(--primary-color);
        color: var(--dark-bg);
    }

    .btn-delete {
        border-color: var(--error);
        color: var(--error);
    }

    .btn-delete:hover {
        background: var(--error);
        color: white;
    }

    .review-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .form-textarea {
        width: 100%;
        padding: 0.75rem;
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        border-radius: 4px;
        resize: vertical;
        font-family: inherit;
    }

    .form-textarea:focus {
        outline: none;
        border-color: var(--primary-color);
    }

    #starRating {
        display: flex;
        gap: 0.5rem;
        font-size: 2rem;
    }

    #starRating .star {
        cursor: pointer;
        transition: transform 0.2s;
    }

    #starRating .star:hover {
        transform: scale(1.2);
    }

    .no-data {
        text-align: center;
        color: var(--text-secondary);
        padding: 3rem;
        font-size: 1.1rem;
    }

    .error {
        text-align: center;
        color: var(--error);
        padding: 2rem;
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

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
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