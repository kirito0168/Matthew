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
    
    // Check if nav-auth element exists before trying to modify it
    if (!navAuth) {
        console.log('No .nav-auth element found, skipping navigation update');
        return;
    }
    
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
        if (navMenu) {
            const existingQuestLink = Array.from(navMenu.children).find(li => 
                li.querySelector('a[href="/quests.html"]')
            );
            
            if (!existingQuestLink) {
                const questLi = document.createElement('li');
                questLi.innerHTML = '<a href="/quests.html" class="nav-link">Quests</a>';
                navMenu.insertBefore(questLi, navAuth);
            }
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

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Set notification styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-weight: 500;
    `;

    // Set background color based on type
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };
    notification.style.background = colors[type] || colors.info;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// Load homepage stats
function loadHomeStats() {
    const statsElements = {
        totalUsers: document.getElementById('totalUsers'),
        activeReports: document.getElementById('activeReports'),
        resolvedVulns: document.getElementById('resolvedVulns'),
        totalRewards: document.getElementById('totalRewards')
    };

    // Animate counter if elements exist
    Object.entries(statsElements).forEach(([key, element]) => {
        if (element) {
            const targetValue = parseInt(element.textContent) || 0;
            animateCounter(element, targetValue);
        }
    });
}

// Animate counter function
function animateCounter(element, target) {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 30);
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