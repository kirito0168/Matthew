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

    // Check if functions exist, if not define them locally
    if (typeof escapeHtml !== 'function') {
        window.escapeHtml = function(text) {
            if (!text) return '';
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        };
    }

    if (typeof generateStars !== 'function') {
        window.generateStars = function(rating) {
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                stars += `<span class="star ${i <= rating ? 'filled' : ''}">⭐</span>`;
            }
            return stars;
        };
    }

    if (typeof formatDate !== 'function') {
        window.formatDate = function(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        };
    }

    reviewsList.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="reviewer-info">
                    <img src="${review.avatar_url || '/images/default-avatar.png'}" alt="Avatar" class="reviewer-avatar">
                    <div>
                        <div class="reviewer-name">${escapeHtml(review.username)}</div>
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

function updateStats(total, average) {
    document.getElementById('totalReviews').textContent = total || 0;
    // Convert average to number and handle null/undefined
    const avgNum = parseFloat(average) || 0;
    document.getElementById('avgRating').textContent = avgNum.toFixed(1);
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
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
        const response = await fetch(`${API_URL}/reviews/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            showNotification('Review deleted successfully!', 'success');
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