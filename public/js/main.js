// Main JavaScript for SAO Bug Bounty System

// API Base URL
const API_URL = '/api';

// Check authentication status
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.user;
        } else {
            localStorage.removeItem('token');
            return null;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return null;
    }
}

// Update navigation based on auth status
async function updateNavigation() {
    const user = await checkAuth();
    const navAuth = document.querySelector('.nav-auth');
    
    if (user) {
        navAuth.innerHTML = `
            <div class="user-menu">
                <span class="user-info">
                    <span class="user-level">Lv.${user.level}</span>
                    <span class="user-name">${user.username}</span>
                </span>
                <div class="user-dropdown">
                    <a href="/dashboard.html" class="dropdown-link">Dashboard</a>
                    <a href="/profile.html" class="dropdown-link">Profile</a>
                    <a href="/vulnerabilities.html" class="dropdown-link">Vulnerabilities</a>
                    <a href="/quests.html" class="dropdown-link">Quests</a>
                    <a href="/reviews.html" class="dropdown-link">Reviews</a>
                    <a href="#" class="dropdown-link" onclick="logout()">Logout</a>
                </div>
            </div>
        `;
        
        // Add Quests link to nav menu if not already present and user is logged in
        const navMenu = document.querySelector('.nav-menu');
        const questsLinkExists = Array.from(navMenu.querySelectorAll('.nav-link')).some(link => link.href.includes('/quests.html'));
        
        if (!questsLinkExists) {
            const questsItem = document.createElement('li');
            questsItem.innerHTML = '<a href="/quests.html" class="nav-link">Quests</a>';
            navMenu.insertBefore(questsItem, navAuth);
        }
    } else {
        // If not logged in, show login/register buttons
        navAuth.innerHTML = `
            <a href="/login.html" class="btn-login">Login</a>
            <a href="/register.html" class="btn-register">Register</a>
        `;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showNotification('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        background: var(--card-bg);
        border: 2px solid var(--${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'primary'}-color);
        color: var(--text-primary);
        border-radius: 4px;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Create loading spinner
function createLoadingSpinner() {
    return '<div class="loading-spinner"></div>';
}

// Load home page stats
async function loadHomeStats() {
    if (!document.getElementById('totalPlayers')) return;
    
    try {
        const response = await fetch(`${API_URL}/stats`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalPlayers').textContent = data.stats.totalPlayers || 0;
            document.getElementById('totalBugs').textContent = data.stats.totalBugs || 0;
            document.getElementById('totalQuests').textContent = data.stats.totalQuests || 0;
        }
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// Require authentication
async function requireAuth() {
    const user = await checkAuth();
    if (!user) {
        showNotification('Please login to access this page', 'error');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
        return false;
    }
    return user;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await updateNavigation();
    
    // Only load home stats if on home page
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        loadHomeStats();
    }
    
    // Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Add modal close functionality
    const modalClose = document.querySelector('.modal-close');
    const modal = document.getElementById('systemModal');
    
    if (modalClose && modal) {
        modalClose.onclick = () => {
            modal.style.display = 'none';
        };
        
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
});

// Export functions for use in other scripts
window.checkAuth = checkAuth;
window.requireAuth = requireAuth;
window.showNotification = showNotification;
window.formatDate = formatDate;
window.createLoadingSpinner = createLoadingSpinner;
window.API_URL = API_URL;