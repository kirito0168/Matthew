// Profile JavaScript

let currentTab = 'all';
let profileData = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Require authentication
    const user = await requireAuth();
    if (!user) return;

    // Load profile data
    await loadProfileData();
});

async function loadProfileData() {
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            profileData = data.profile;
            updateProfileDisplay(profileData);
            loadAchievements();
            loadActivity();
            loadQuestHistory();
            loadUserRank();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Error loading profile data', 'error');
    }
}

function updateProfileDisplay(profile) {
    // Update header info
    document.getElementById('playerName').textContent = profile.username;
    document.getElementById('currentTitle').textContent = profile.current_title;
    document.getElementById('levelBadge').textContent = `Lv.${profile.level}`;
    document.getElementById('joinDate').textContent = new Date(profile.created_at).toLocaleDateString();

    // Update stats
    document.getElementById('playerLevel').textContent = profile.level;
    document.getElementById('playerExp').textContent = profile.exp;
    document.getElementById('bugsReported').textContent = profile.vulnerabilities_reported || 0;
    document.getElementById('bugsResolved').textContent = profile.vulnerabilities_resolved || 0;
    document.getElementById('questsCompleted').textContent = profile.quests_completed || 0;
    document.getElementById('reviewsGiven').textContent = profile.reviews_given || 0;

    // Update experience bar
    const nextLevelExp = profile.nextLevelExp;
    const currentExp = profile.exp;
    const expPercentage = (currentExp / nextLevelExp) * 100;

    const expBar = document.getElementById('expBar');
    const expText = document.getElementById('expText');

    expBar.style.width = expPercentage + '%';
    expText.textContent = `${currentExp} / ${nextLevelExp}`;

    // Animate the exp bar
    setTimeout(() => {
        expBar.style.transition = 'width 1s ease-out';
    }, 100);
}

async function loadAchievements() {
    const achievementsGrid = document.getElementById('achievementsGrid');
    
    try {
        // First get all achievements with user's unlock status
        const response = await fetch(`${API_URL}/achievements`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const allAchievements = [];
            
            // Flatten achievements from grouped structure
            if (data.achievements) {
                Object.values(data.achievements).forEach(typeAchievements => {
                    allAchievements.push(...typeAchievements);
                });
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
            console.error('Failed to load achievements:', response.status);
            achievementsGrid.innerHTML = '<p class="error">Error loading achievements</p>';
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
    
    if (!profileData || !profileData.recentActivities) {
        activityList.innerHTML = '<p class="no-data">No activity to display</p>';
        return;
    }

    let activities = profileData.recentActivities;

    // Filter by tab
    if (currentTab !== 'all') {
        const tabFilters = {
            'bugs': ['vulnerability_reported', 'vulnerability_resolved'],
            'quests': ['quest_completed'],
            'achievements': ['achievement_unlocked', 'level_up']
        };
        
        activities = activities.filter(activity => 
            tabFilters[currentTab].includes(activity.action_type)
        );
    }

    if (activities.length === 0) {
        activityList.innerHTML = '<p class="no-data">No activity in this category</p>';
        return;
    }

    activityList.innerHTML = activities.map(activity => {
        // Safely parse details - handle both string and object cases
        let details = {};
        if (activity.details) {
            if (typeof activity.details === 'string') {
                try {
                    details = JSON.parse(activity.details);
                } catch (e) {
                    console.warn('Failed to parse activity details:', activity.details);
                    details = {};
                }
            } else if (typeof activity.details === 'object') {
                details = activity.details;
            }
        }
        
        return `
            <div class="activity-item">
                <div>
                    <div class="activity-type">${formatActivityType(activity.action_type)}</div>
                    <div class="activity-details">${formatActivityDetails(activity.action_type, details)}</div>
                </div>
                <div class="activity-time">${formatDate(activity.created_at)}</div>
            </div>
        `;
    }).join('');
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
    return types[type] || type;
}

function formatActivityDetails(type, details) {
    switch (type) {
        case 'vulnerability_reported':
            return `Reported: ${details.title || 'Unknown'}`;
        case 'vulnerability_resolved':
            return `Resolved: ${details.title || 'Unknown'} (+${details.expReward || 0} EXP)`;
        case 'quest_completed':
            return `Defeated ${details.bossName || 'Boss'} on Floor ${details.floor || '?'} (+${details.expReward || 0} EXP)`;
        case 'achievement_unlocked':
            return `${details.achievementName || 'Achievement'} (+${details.expReward || 0} EXP)`;
        case 'level_up':
            return `Reached Level ${details.newLevel || '?'}!`;
        case 'review_posted':
            return `Reviewed: ${details.title || 'Unknown'}`;
        default:
            return 'Activity completed';
    }
}

async function loadQuestHistory() {
    const questList = document.getElementById('questList');
    
    try {
        const response = await fetch(`${API_URL}/quests/history`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const quests = data.questHistory;

            if (quests.length === 0) {
                questList.innerHTML = '<p class="no-data">No quests completed yet</p>';
                return;
            }

            questList.innerHTML = quests.map(quest => `
                <div class="quest-item">
                    <div>
                        <div class="quest-name">${quest.boss_name}</div>
                        <div class="quest-floor">Floor ${quest.floor_number}</div>
                    </div>
                    <div>
                        <div class="quest-damage">${quest.damage_dealt} DMG</div>
                        <div class="quest-date">${formatDate(quest.completed_at)}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading quest history:', error);
        questList.innerHTML = '<p class="error">Error loading quest history</p>';
    }
}

async function loadUserRank() {
    try {
        const response = await fetch(`${API_URL}/rankings/user`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('playerRank').textContent = `#${data.rank}`;
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
    event.target.classList.add('active');
    
    // Reload activity
    loadActivity();
}

// Title modal functions
async function openTitleModal() {
    const modal = document.getElementById('titleModal');
    const titlesGrid = document.getElementById('titlesGrid');
    
    modal.style.display = 'block';
    
    try {
        const response = await fetch(`${API_URL}/users/titles`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const titles = data.titles;

            titlesGrid.innerHTML = titles.map(title => `
                <div class="title-option ${title.title === profileData.current_title ? 'selected' : ''}" 
                     onclick="selectTitle('${title.title}')">
                    <div class="title-name">${title.title}</div>
                    <div class="title-requirement">${title.requirement}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading titles:', error);
        showNotification('Error loading titles', 'error');
    }
}

function closeTitleModal() {
    const modal = document.getElementById('titleModal');
    modal.style.display = 'none';
}

async function selectTitle(title) {
    try {
        const response = await fetch(`${API_URL}/users/title`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ title })
        });

        if (response.ok) {
            showNotification('Title changed successfully!', 'success');
            profileData.current_title = title;
            document.getElementById('currentTitle').textContent = title;
            closeTitleModal();
        }
    } catch (error) {
        console.error('Error changing title:', error);
        showNotification('Error changing title', 'error');
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            return diffMinutes === 0 ? 'Just now' : `${diffMinutes}m ago`;
        }
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Animation for stats
function animateNumbers() {
    const stats = document.querySelectorAll('.stat-value');
    stats.forEach(stat => {
        const finalValue = parseInt(stat.textContent);
        let currentValue = 0;
        const increment = Math.ceil(finalValue / 20);
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= finalValue) {
                currentValue = finalValue;
                clearInterval(timer);
            }
            stat.textContent = currentValue;
        }, 50);
    });
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('titleModal');
    if (event.target === modal) {
        closeTitleModal();
    }
}

// Export functions
window.switchTab = switchTab;
window.openTitleModal = openTitleModal;
window.closeTitleModal = closeTitleModal;
window.selectTitle = selectTitle;