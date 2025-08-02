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
        // Clear existing content
        navAuth.innerHTML = '';
        
        // Create user menu
        const userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
        
        userMenu.innerHTML = `
            <div class="user-info">
                <span class="user-level">Lv.${user.level}</span>
                <span class="user-name">${user.username}</span>
            </div>
            <div class="user-dropdown">
                <a href="/dashboard.html" class="dropdown-link">Dashboard</a>
                <a href="/profile.html" class="dropdown-link">Profile</a>
                <a href="/vulnerabilities.html" class="dropdown-link">Vulnerabilities</a>
                <a href="/reports.html" class="dropdown-link">Reports</a>
                <a href="/quest-game.html" class="dropdown-link">Quests</a>
                <a href="/reviews.html" class="dropdown-link">Reviews</a>
                <a href="#" class="dropdown-link" onclick="logout(); return false;">Logout</a>
            </div>
        `;
        
        navAuth.appendChild(userMenu);
        
        // Add click event to toggle dropdown on mobile
        const userInfo = userMenu.querySelector('.user-info');
        userInfo.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('active');
        });
        
        // Add quest link to main menu if it doesn't exist
        const navMenu = document.querySelector('.nav-menu');
        const existingQuestLink = Array.from(navMenu.children).find(li => 
            li.querySelector('a[href="/quests.html"]')
        );
        
        if (!existingQuestLink) {
            const questLi = document.createElement('li');
            questLi.innerHTML = '<a href="/quests.html" class="nav-link">Quests</a>';
            navMenu.insertBefore(questLi, navAuth);
        }
        
        // Update hero actions for logged-in users
        updateHeroActions(true);
    } else {
        // Show login/register buttons for non-authenticated users
        navAuth.innerHTML = `
            <a href="/login.html" class="btn-login">Login</a>
            <a href="/register.html" class="btn-register">Register</a>
        `;
        
        // Update hero actions for non-logged-in users
        updateHeroActions(false);
    }
}

// Update hero actions based on auth status
function updateHeroActions(isLoggedIn) {
    const heroActions = document.getElementById('heroActions');
    if (!heroActions) return;
    
    if (isLoggedIn) {
        heroActions.innerHTML = `
            <a href="/dashboard.html" class="btn-primary">Go to Dashboard</a>
            <a href="/quests.html" class="btn-secondary">Start Quests</a>
        `;
    } else {
        heroActions.innerHTML = `
            <a href="/register.html" class="btn-primary">Start Your Adventure</a>
            <a href="/ranking.html" class="btn-secondary">View Rankings</a>
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
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add notification styles if not already present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 2rem;
                background: var(--card-bg);
                border: 2px solid var(--primary-color);
                border-radius: 8px;
                color: var(--text-primary);
                z-index: 9999;
                animation: slideIn 0.3s ease-out;
            }
            
            .notification.success {
                border-color: var(--success);
                background: rgba(76, 175, 80, 0.1);
            }
            
            .notification.error {
                border-color: var(--danger);
                background: rgba(244, 67, 54, 0.1);
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
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Fetch and display stats on homepage
async function loadHomeStats() {
    if (!document.getElementById('totalPlayers')) return;

    try {
        // Fetch total players
        const playersResponse = await fetch(`${API_URL}/rankings?limit=1`);
        if (playersResponse.ok) {
            const playersData = await playersResponse.json();
            document.getElementById('totalPlayers').textContent = playersData.pagination?.total || 0;
        }

        // Fetch total bugs
        const bugsResponse = await fetch(`${API_URL}/vulnerabilities?limit=1`);
        if (bugsResponse.ok) {
            const bugsData = await bugsResponse.json();
            document.getElementById('totalBugs').textContent = bugsData.pagination?.total || 0;
        }

        // Fetch total quests
        const questsResponse = await fetch(`${API_URL}/quests`);
        if (questsResponse.ok) {
            const questsData = await questsResponse.json();
            document.getElementById('totalQuests').textContent = questsData.quests?.length || 0;
        }

        // Animate numbers
        setTimeout(() => animateNumbers(), 500);
    } catch (error) {
        console.error('Error loading stats:', error);
        // Set default values if API fails
        document.getElementById('totalPlayers').textContent = '0';
        document.getElementById('totalBugs').textContent = '0';
        document.getElementById('totalQuests').textContent = '0';
    }
}

// Animate number counting
function animateNumbers() {
    const numbers = document.querySelectorAll('.stat-number');
    numbers.forEach(num => {
        const target = parseInt(num.textContent);
        if (target === 0) return;
        
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

// Close dropdowns when clicking outside
function handleDocumentClick(event) {
    const userMenus = document.querySelectorAll('.user-menu');
    userMenus.forEach(menu => {
        if (!menu.contains(event.target)) {
            menu.classList.remove('active');
        }
    });
}

// Add active class to current page nav link
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath || 
            (currentPath === '/' && linkPath === '/') ||
            (currentPath === '/index.html' && linkPath === '/')) {
            link.classList.add('active');
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing main.js...');
    
    // Update navigation first
    await updateNavigation();
    
    // Load homepage stats
    loadHomeStats();
    
    // Set active nav link
    setActiveNavLink();
    
    // Add document click listener for dropdown management
    document.addEventListener('click', handleDocumentClick);
    
    // Prevent dropdown links from closing dropdown immediately
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-link') && e.target.getAttribute('href') !== '#') {
            const userMenu = e.target.closest('.user-menu');
            if (userMenu) {
                userMenu.classList.remove('active');
            }
        }
    });
    
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
    
    console.log('Main.js initialization complete');
});
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<span class="star filled">★</span>';
        } else {
            stars += '<span class="star">☆</span>';
        }
    }
    return stars;
}

// Export functions for use in other scripts
window.checkAuth = checkAuth;
window.updateNavigation = updateNavigation;
window.requireAuth = requireAuth;
window.showNotification = showNotification;
window.formatDate = formatDate;
window.createLoadingSpinner = createLoadingSpinner;
window.API_URL = API_URL;
window.logout = logout;
window.escapeHtml = escapeHtml;
window.generateStars = generateStars;