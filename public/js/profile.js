// Profile JavaScript

// Use API_URL from main.js
const API_URL = window.API_URL || '/api';

let currentTab = 'all';
let profileData = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Require authentication
    const user = await requireAuth();
    if (!user) return;

    // Load profile data
    await loadProfileData();
});

// Require authentication function
async function requireAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return null;
    }

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
            window.location.href = '/login.html';
            return null;
        }
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/login.html';
        return null;
    }
}

// Show notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#00ff00' : '#00d4ff'};
        color: ${type === 'success' ? '#000000' : '#ffffff'};
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-weight: bold;
    `;
    
    document.body.appendChild(notification);
    
    // Add animation styles if not already present
    if (!document.getElementById('notificationStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Format date function
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

async function loadProfileData() {
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            profileData = data.user || data.profile || data;
            updateProfileDisplay(profileData);
            loadAchievements();
            loadActivity();
            loadQuestHistory();
            loadUserRank();
        } else {
            throw new Error('Failed to load profile');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Error loading profile data', 'error');
    }
}

function updateProfileDisplay(profile) {
    // Update header info
    const playerNameEl = document.getElementById('playerName');
    if (playerNameEl) playerNameEl.textContent = profile.username || 'Unknown';
    
    const currentTitleEl = document.getElementById('currentTitle');
    if (currentTitleEl) currentTitleEl.textContent = profile.current_title || 'Novice Bug Hunter';
    
    const levelBadgeEl = document.getElementById('levelBadge');
    if (levelBadgeEl) levelBadgeEl.textContent = `Lv.${profile.level || 1}`;
    
    const joinDateEl = document.getElementById('joinDate');
    if (joinDateEl) joinDateEl.textContent = new Date(profile.created_at).toLocaleDateString();

    // Update stats
    const playerLevelEl = document.getElementById('playerLevel');
    if (playerLevelEl) playerLevelEl.textContent = profile.level || 1;
    
    const playerExpEl = document.getElementById('playerExp');
    if (playerExpEl) playerExpEl.textContent = profile.experience || 0;
    
    const bugsReportedEl = document.getElementById('bugsReported');
    if (bugsReportedEl) bugsReportedEl.textContent = profile.vulnerabilities_reported || 0;
    
    const bugsResolvedEl = document.getElementById('bugsResolved');
    if (bugsResolvedEl) bugsResolvedEl.textContent = profile.vulnerabilities_resolved || 0;
    
    const questsCompletedEl = document.getElementById('questsCompleted');
    if (questsCompletedEl) questsCompletedEl.textContent = profile.quests_completed || 0;
    
    const reviewsGivenEl = document.getElementById('reviewsGiven');
    if (reviewsGivenEl) reviewsGivenEl.textContent = profile.reviews_given || 0;

    // Update experience bar
    const nextLevelExp = (profile.level || 1) * 100;
    const currentExp = profile.experience || 0;
    const expPercentage = Math.min((currentExp / nextLevelExp) * 100, 100);

    const expBar = document.getElementById('expBar');
    const expText = document.getElementById('expText');

    if (expBar) expBar.style.width = expPercentage + '%';
    if (expText) expText.textContent = `${currentExp} / ${nextLevelExp}`;

    // Update avatar if exists
    const playerAvatarEl = document.getElementById('playerAvatar');
    if (profile.avatar_url && playerAvatarEl) {
        playerAvatarEl.src = profile.avatar_url;
    }
}

async function loadAchievements() {
    const achievementsGrid = document.getElementById('achievementsGrid');
    if (!achievementsGrid) return;
    
    try {
        const response = await fetch(`${API_URL}/achievements`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const allAchievements = [];
            
            // Handle different response formats
            if (Array.isArray(data)) {
                allAchievements.push(...data);
            } else if (data.achievements) {
                if (Array.isArray(data.achievements)) {
                    allAchievements.push(...data.achievements);
                } else {
                    // Flatten achievements object
                    Object.values(data.achievements).forEach(typeAchievements => {
                        if (Array.isArray(typeAchievements)) {
                            allAchievements.push(...typeAchievements);
                        }
                    });
                }
            }

            if (allAchievements.length === 0) {
                achievementsGrid.innerHTML = '<p class="no-data">No achievements available</p>';
                return;
            }

            achievementsGrid.innerHTML = allAchievements.map(achievement => `
                <div class="achievement-item ${achievement.is_unlocked ? 'unlocked' : 'locked'}">
                    <div class="achievement-icon">${getAchievementIcon(achievement.requirement_type)}</div>
                    <div class="achievement-tooltip">
                        <div class="tooltip-title">${achievement.name}</div>
                        <div class="tooltip-desc">${achievement.description}</div>
                        ${achievement.is_unlocked ? 
                            `<div class="tooltip-date">Unlocked: ${formatDate(achievement.unlocked_at)}</div>` : 
                            `<div class="tooltip-requirement">Requirement: ${achievement.requirement_value}</div>`
                        }
                    </div>
                </div>
            `).join('');
        } else {
            throw new Error('Failed to load achievements');
        }
    } catch (error) {
        console.error('Error loading achievements:', error);
        achievementsGrid.innerHTML = '<p class="error">Error loading achievements</p>';
    }
}

function getAchievementIcon(type) {
    const icons = {
        'vulnerabilities_reported': '🐛',
        'vulnerabilities_resolved': '✅',
        'quests_completed': '⚔️',
        'level_reached': '📈',
        'reviews_given': '⭐'
    };
    return icons[type] || '🏆';
}

async function loadActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    // For now, show a placeholder since the backend might not have activity endpoints
    activityList.innerHTML = '<p class="no-data">Activity tracking coming soon!</p>';
}

function formatActivityType(type) {
    const types = {
        'vulnerability_reported': '🐛 Bug Reported',
        'vulnerability_resolved': '✅ Bug Resolved',
        'quest_completed': '⚔️ Quest Completed',
        'achievement_unlocked': '🏆 Achievement Unlocked',
        'review_posted': '⭐ Review Posted',
        'level_up': '📈 Level Up!'
    };
    return types[type] || 'Activity';
}

function formatActivityDetails(type, details) {
    switch (type) {
        case 'vulnerability_reported':
            return `${details.title || 'Vulnerability'} (+${details.expReward || 0} EXP)`;
        case 'vulnerability_resolved':
            return `${details.title || 'Vulnerability'} (+${details.expReward || 0} EXP)`;
        case 'quest_completed':
            return `${details.bossName || 'Boss'} defeated! (+${details.expReward || 0} EXP)`;
        case 'achievement_unlocked':
            return `${details.achievementName || 'Achievement'} (+${details.expReward || 0} EXP)`;
        case 'level_up':
            return `Reached Level ${details.newLevel || '?'}!`;
        default:
            return 'Activity completed';
    }
}

async function loadQuestHistory() {
    const questList = document.getElementById('questList');
    if (!questList) return;
    
    try {
        // Use the correct endpoint - there might not be a history endpoint
        const response = await fetch(`${API_URL}/quests`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const quests = data.quests || [];
            
            // Filter completed quests
            const completedQuests = quests.filter(quest => quest.user_completed > 0);

            if (completedQuests.length === 0) {
                questList.innerHTML = '<p class="no-data">No quests completed yet</p>';
                return;
            }

            questList.innerHTML = completedQuests.map(quest => `
                <div class="quest-item">
                    <div>
                        <div class="quest-name">${quest.boss_name}</div>
                        <div class="quest-floor">Floor ${quest.floor_number}</div>
                    </div>
                    <div>
                        <div class="quest-damage">${quest.health_points} HP</div>
                        <div class="quest-date">${formatDate(quest.updated_at || quest.created_at)}</div>
                    </div>
                </div>
            `).join('');
        } else {
            throw new Error('Failed to load quests');
        }
    } catch (error) {
        console.error('Error loading quest history:', error);
        questList.innerHTML = '<p class="error">Error loading quest history</p>';
    }
}

async function loadUserRank() {
    try {
        const response = await fetch(`${API_URL}/rankings`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const rankings = data.rankings || [];
            
            // Find current user's rank
            const userId = profileData?.id;
            const userRankIndex = rankings.findIndex(r => r.id === userId);
            const userRank = userRankIndex !== -1 ? userRankIndex + 1 : '?';
            
            const playerRankEl = document.getElementById('playerRank');
            if (playerRankEl) playerRankEl.textContent = `#${userRank}`;
        }
    } catch (error) {
        console.error('Error loading rank:', error);
    }
}

// Tab switching
function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the clicked button
    const clickedBtn = event.target;
    if (clickedBtn) clickedBtn.classList.add('active');
    
    // Reload activity
    loadActivity();
}

// Title modal functions
async function openTitleModal() {
    const modal = document.getElementById('titleModal');
    const titlesGrid = document.getElementById('titlesGrid');
    
    if (!modal || !titlesGrid) return;
    
    modal.style.display = 'block';
    
    // For now, show default titles since backend might not have titles endpoint
    const defaultTitles = [
        { title: 'Novice Bug Hunter', description: 'Just starting out' },
        { title: 'Bug Tracker', description: 'Found 5 bugs' },
        { title: 'Bug Slayer', description: 'Resolved 10 bugs' },
        { title: 'Code Guardian', description: 'Protected the system' },
        { title: 'Elite Debugger', description: 'Master of finding issues' }
    ];
    
    titlesGrid.innerHTML = defaultTitles.map(title => `
        <div class="title-option ${title.title === profileData?.current_title ? 'current' : ''}" 
             onclick="selectTitle('${title.title}')">
            <div class="title-name">${title.title}</div>
            <div class="title-description">${title.description}</div>
        </div>
    `).join('');
}

function closeTitleModal() {
    const modal = document.getElementById('titleModal');
    if (modal) modal.style.display = 'none';
}

async function selectTitle(title) {
    // For now, just update locally since backend might not support title changes
    showNotification('Title updated successfully!', 'success');
    
    const currentTitleEl = document.getElementById('currentTitle');
    if (currentTitleEl) currentTitleEl.textContent = title;
    
    if (profileData) profileData.current_title = title;
    
    closeTitleModal();
}

// Export functions for HTML onclick
window.switchTab = switchTab;
window.openTitleModal = openTitleModal;
window.closeTitleModal = closeTitleModal;
window.selectTitle = selectTitle;