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
        
        // Add active states for logged-in only pages
        const navMenu = document.querySelector('.nav-menu');
        const additionalLinks = ['<li><a href="/quests.html" class="nav-link">Quests</a></li>'];
        additionalLinks.forEach(link => {
            const li = document.createElement('li');
            li.innerHTML = link;
            navMenu.insertBefore(li, navAuth);
        });
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
        border-radius: 8px;
        animation: slideIn 0.3s ease-out;
        z-index: 9999;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Fetch and display stats on homepage
async function loadHomeStats() {
    if (!document.getElementById('totalPlayers')) return;

    try {
        // Fetch total players
        const playersResponse = await fetch(`${API_URL}/rankings?limit=1`);
        const playersData = await playersResponse.json();
        document.getElementById('totalPlayers').textContent = playersData.pagination.total || 0;

        // Fetch total bugs
        const bugsResponse = await fetch(`${API_URL}/vulnerabilities?limit=1`);
        const bugsData = await bugsResponse.json();
        document.getElementById('totalBugs').textContent = bugsData.pagination.total || 0;

        // Fetch total quests
        const questsResponse = await fetch(`${API_URL}/quests`);
        const questsData = await questsResponse.json();
        document.getElementById('totalQuests').textContent = questsData.quests.length || 0;

        // Animate numbers
        animateNumbers();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Animate number counting
function animateNumbers() {
    const numbers = document.querySelectorAll('.stat-number');
    numbers.forEach(num => {
        const target = parseInt(num.textContent);
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                num.textContent = target;
                clearInterval(timer);
            } else {
                num.textContent = Math.floor(current);
            }
        }, 30);
    });
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Create loading spinner
function createLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    return spinner;
}

// Handle protected routes
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
    loadHomeStats();
    
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