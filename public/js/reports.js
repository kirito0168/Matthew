// Reports/Reviews Page JavaScript - Complete Fixed Version

let selectedRating = 0;
let currentPage = 1;
const itemsPerPage = 10;
let editingReviewId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    await checkAuth();
    
    // Load reviews
    await loadReports();

    // Setup star rating
    setupStarRating();
    
    // Setup form handler
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }

    // Setup modal close on outside click
    window.onclick = function(event) {
        const modal = document.getElementById('reviewModal');
        if (event.target === modal) {
            closeReviewModal();
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
            displayReviews(data.reviews || []);
            displayPagination(data.pagination || {});
            // Safely pass averageRating, handling undefined/null cases
            const avgRating = data.averageRating || data.average || 0;
            const totalCount = (data.pagination && data.pagination.total) || 0;
            updateStats(totalCount, avgRating);
        } else {
            throw new Error('Failed to load reviews');
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        reviewsList.innerHTML = '<p class="error">Error loading reviews. Please try again later.</p>';
        // Set default values on error
        updateStats(0, 0);
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

function updateStats(total, average) {
    const totalReviews = document.getElementById('totalReviews');
    const averageRating = document.getElementById('averageRating');
    
    if (totalReviews) {
        totalReviews.textContent = total || 0;
    }
    
    if (averageRating) {
        // Ensure average is a valid number before calling toFixed
        const avgValue = (average !== null && average !== undefined && !isNaN(average)) 
            ? parseFloat(average).toFixed(1) 
            : '0.0';
        averageRating.textContent = avgValue;
    }
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<span class="star ${i <= rating ? '' : 'empty'}">⭐</span>`;
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
    window.scrollTo(0, 0);
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
            showRatingValue(selectedRating);
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
        } else {
            star.classList.remove('filled');
        }
    });
}

function showRatingValue(rating) {
    const ratingDisplay = document.getElementById('ratingDisplay');
    if (ratingDisplay) {
        const ratingText = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        ratingDisplay.textContent = `${rating}/5 - ${ratingText[rating]}`;
    }
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
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Please login to write a review', 'error');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
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
    hideRatingValue();
    
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
                vulnerabilityId: null // General review
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(
                editingReviewId ? 'Review updated successfully!' : 'Review submitted successfully!', 
                'success'
            );
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
    const token = localStorage.getItem('token');
    if (!token) {
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
        if (!token) {
            showNotification('Please login to delete your review', 'error');
            return;
        }

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
            const data = await response.json();
            throw new Error(data.message || 'Failed to delete review');
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        showNotification(error.message || 'Error deleting review', 'error');
    }
}

// Notification function
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} show`;
    notification.textContent = message;
    
    // Add inline styles for notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        background: ${type === 'success' ? 'rgba(76, 175, 80, 0.9)' : type === 'error' ? 'rgba(244, 67, 54, 0.9)' : 'rgba(0, 212, 255, 0.9)'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('show');
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add dynamic styles for animations
function addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
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
    document.head.appendChild(style);
}

// Initialize notification styles
addNotificationStyles();

// Export functions to global scope for onclick handlers
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.editReview = editReview;
window.deleteReview = deleteReview;
window.changePage = changePage;