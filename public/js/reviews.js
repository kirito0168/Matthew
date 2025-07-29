// Reviews JavaScript

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
    await loadReviews();

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

async function loadReviews() {
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
        console.error('Error loading reviews:', error);
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
                <div class="reviewer-info">
                    <img src="${review.avatar_url || '/images/default-avatar.png'}" alt="Avatar" class="reviewer-avatar">
                    <div>
                        <div class="reviewer-name">${review.username}</div>
                        <div class="reviewer-level">Level ${review.level}</div>
                    </div>
                </div>
                <div class="review-rating">
                    ${generateStars(review.rating)}
                </div>
            </div>
            <div class="review-content">
                ${review.comment ? `<p class="review-comment">${escapeHtml(review.comment)}</p>` : '<p class="review-comment">No comment provided</p>'}
                ${review.vulnerability_title ? 
                    `<p class="review-context">Review for: <span class="vuln-link">${escapeHtml(review.vulnerability_title)}</span></p>` : 
                    ''}
            </div>
            <div class="review-footer">
                <span class="review-date">${formatDate(review.created_at)}</span>
                ${currentUser && currentUser.id && review.user_id === currentUser.id ? 
                    `<div class="review-actions">
                        <button class="btn-edit" onclick="editReview(${review.id}, ${review.rating}, '${escapeHtml(review.comment || '').replace(/'/g, "\\'")}')">Edit</button>
                        <button class="btn-delete" onclick="deleteReview(${review.id})">Delete</button>
                    </div>` : 
                    ''}
            </div>
        </div>
    `).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<span class="star ${i <= rating ? 'filled' : ''}">⭐</span>`;
    }
    return stars;
}

function updateStats(total, average) {
    document.getElementById('totalReviews').textContent = total || 0;
    document.getElementById('avgRating').textContent = average ? average.toFixed(1) : '0.0';
}

function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    
    if (!pagination || pagination.totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let html = '<div class="pagination-controls">';
    
    if (pagination.page > 1) {
        html += `<button class="page-btn" onclick="changePage(${pagination.page - 1})">Previous</button>`;
    }

    // Show limited page numbers
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);

    if (startPage > 1) {
        html += `<button class="page-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) html += '<span>...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === pagination.page) {
            html += `<span class="page-current">${i}</span>`;
        } else {
            html += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
        }
    }

    if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) html += '<span>...</span>';
        html += `<button class="page-btn" onclick="changePage(${pagination.totalPages})">${pagination.totalPages}</button>`;
    }

    if (pagination.page < pagination.totalPages) {
        html += `<button class="page-btn" onclick="changePage(${pagination.page + 1})">Next</button>`;
    }

    html += '</div>';
    paginationDiv.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadReviews();
}

// Star rating setup
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
            updateStarDisplay(parseInt(star.dataset.rating));
        });
    });
    
    starContainer.addEventListener('mouseleave', () => {
        updateStarDisplay(selectedRating);
    });
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('#starRating .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

// Review modal functions
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

    document.getElementById('reviewModal').style.display = 'block';
    document.getElementById('modalTitle').textContent = 'Write a Review';
    document.getElementById('submitButton').textContent = 'Submit Review';
    editingReviewId = null;
    selectedRating = 0;
    updateStarDisplay(0);
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
    document.getElementById('reviewForm').reset();
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

    const comment = document.getElementById('reviewComment').value;

    try {
        let response;
        
        if (editingReviewId) {
            // Update existing review
            response = await fetch(`${API_URL}/reviews/${editingReviewId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    rating: selectedRating, 
                    comment: comment || null
                })
            });
        } else {
            // Create new review
            response = await fetch(`${API_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    rating: selectedRating, 
                    comment: comment || null,
                    vulnerabilityId: null // General review
                })
            });
        }

        if (response.ok) {
            showNotification(editingReviewId ? 'Review updated successfully!' : 'Review posted successfully!', 'success');
            closeReviewModal();
            loadReviews();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to save review', 'error');
        }
    } catch (error) {
        console.error('Error saving review:', error);
        showNotification('Error saving review', 'error');
    }
}

function editReview(id, rating, comment) {
    editingReviewId = id;
    selectedRating = rating;
    document.getElementById('reviewComment').value = comment || '';
    updateStarDisplay(rating);
    
    document.getElementById('reviewModal').style.display = 'block';
    document.getElementById('modalTitle').textContent = 'Edit Review';
    document.getElementById('submitButton').textContent = 'Update Review';
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
            showNotification('Review deleted successfully', 'success');
            loadReviews();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to delete review', 'error');
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        showNotification('Error deleting review', 'error');
    }
}

// Add review-specific styles
const style = document.createElement('style');
style.textContent = `
.reviews-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
}

.reviews-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    animation: fadeInUp 0.5s ease-out;
}

.reviews-stats {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;
    animation: fadeInUp 0.5s ease-out 0.2s backwards;
}

.review-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    animation: fadeInUp 0.5s ease-out;
    transition: all 0.3s ease;
}

.review-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 212, 255, 0.2);
}

.review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.reviewer-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.reviewer-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid var(--primary-color);
}

.reviewer-name {
    font-weight: bold;
    color: var(--primary-color);
}

.reviewer-level {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.review-rating .star {
    color: var(--text-secondary);
    font-size: 1.2rem;
}

.review-rating .star.filled {
    color: var(--accent-color);
}

.review-comment {
    color: var(--text-primary);
    margin-bottom: 1rem;
    line-height: 1.6;
}

.review-context {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.vuln-link {
    color: var(--primary-color);
    cursor: pointer;
}

.review-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
}

.review-date {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.review-actions {
    display: flex;
    gap: 0.5rem;
}

.btn-edit,
.btn-delete {
    padding: 0.25rem 0.75rem;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;
}

.btn-edit:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
}

.btn-delete:hover {
    border-color: var(--danger);
    color: var(--danger);
}

/* Star Rating */
.star-rating {
    display: flex;
    gap: 0.5rem;
    font-size: 2rem;
}

.star {
    cursor: pointer;
    filter: grayscale(100%);
    transition: all 0.3s ease;
}

.star:hover,
.star.selected {
    filter: grayscale(0%);
    transform: scale(1.1);
}

.review-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.form-input {
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 4px;
    resize: vertical;
}

.form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

.form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
}

.btn-secondary {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: 1px solid var(--text-secondary);
    color: var(--text-secondary);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-secondary:hover {
    background: var(--text-secondary);
    color: var(--dark-bg);
}

.pagination-controls {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 2rem;
}

.page-btn {
    padding: 0.5rem 1rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.page-btn:hover {
    background: var(--primary-color);
    color: var(--dark-bg);
}

.page-current {
    padding: 0.5rem 1rem;
    background: var(--primary-color);
    color: var(--dark-bg);
    border-radius: 4px;
    font-weight: bold;
}

.no-data {
    text-align: center;
    color: var(--text-secondary);
    padding: 3rem;
    font-size: 1.1rem;
}

.error {
    text-align: center;
    color: var(--danger);
    padding: 3rem;
    font-size: 1.1rem;
}
`;
document.head.appendChild(style);

// Export functions
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.changePage = changePage;
window.editReview = editReview;
window.deleteReview = deleteReview;