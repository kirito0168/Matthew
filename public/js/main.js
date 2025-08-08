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
        userInfo.addEventListener('click', () => {
            userMenu.classList.toggle('active');
        });
    } else {
        // Not logged in - show login/register links
        navAuth.innerHTML = `
            <a href="/login.html" class="nav-link">Login</a>
            <a href="/register.html" class="nav-link">Register</a>
        `;
    }
}

// Logout function
async function logout() {
    const token = localStorage.getItem('token');
    
    if (token) {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    localStorage.removeItem('token');
    showNotification('Logged out successfully', 'success');
    
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Load homepage stats
async function loadHomeStats() {
    // Check if we're on the homepage by looking for the stats elements
    const totalPlayersElement = document.getElementById('totalPlayers');
    const totalBugsElement = document.getElementById('totalBugs');
    const totalQuestsElement = document.getElementById('totalQuests');
    
    if (!totalPlayersElement || !totalBugsElement || !totalQuestsElement) {
        console.log('Stats elements not found - not on homepage');
        return;
    }
    
    try {
        console.log('Loading homepage stats...');
        const response = await fetch(`${API_URL}/users/stats`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Stats data received:', data);
            
            if (data.success && data.stats) {
                const stats = data.stats;
                
                // Update stats with animation
                updateStatWithAnimation(totalPlayersElement, stats.activeHunters || stats.totalUsers || 0);
                updateStatWithAnimation(totalBugsElement, stats.totalReports || stats.totalVulnerabilities || 0);
                updateStatWithAnimation(totalQuestsElement, stats.totalQuests || 0);
            } else {
                console.error('Stats API returned error:', data.message);
                // Set default values
                totalPlayersElement.textContent = '0';
                totalBugsElement.textContent = '0';
                totalQuestsElement.textContent = '0';
            }
        } else {
            console.error('Stats API request failed:', response.status);
            // Set default values
            totalPlayersElement.textContent = '0';
            totalBugsElement.textContent = '0';
            totalQuestsElement.textContent = '0';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        // Set default values if API fails
        totalPlayersElement.textContent = '0';
        totalBugsElement.textContent = '0';
        totalQuestsElement.textContent = '0';
    }
}

// Animate stat numbers (updated to work with elements directly)
function updateStatWithAnimation(element, targetValue) {
    if (!element) return;
    
    const startValue = 0;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(startValue + (targetValue - startValue) * easeOut);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.textContent = targetValue.toLocaleString();
        }
    }
    
    requestAnimationFrame(animate);
}

// Alternative simpler animation
function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 30);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        if (element) {
            element.textContent = Math.floor(current);
        }
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

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Generate star rating display
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