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

    // Update avatar if exists
    if (profile.avatar_url) {
        document.getElementById('playerAvatar').src = profile.avatar_url;
    }
}

async function loadAchievements() {
    const achievementsGrid = document.getElementById('achievementsGrid');
    
    try {
        const response = await fetch(`${API_URL}/achievements`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const allAchievements = [];
            
            // Flatten achievements
            Object.values(data.achievements).forEach(typeAchievements => {
                allAchievements.push(...typeAchievements);
            });

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
        const details = JSON.parse(activity.details || '{}');
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
            return `Resolved: ${details.title || 'Unknown'} (+${details.expReward} EXP)`;
        case 'quest_completed':
            return `Defeated ${details.bossName || 'Boss'} on Floor ${details.floor || '?'} (+${details.expReward} EXP)`;
        case 'achievement_unlocked':
            return `${details.achievementName || 'Achievement'} (+${details.expReward} EXP)`;
        case 'level_up':
            return `Reached Level ${details.newLevel || '?'}!`;
        default:
            return JSON.stringify(details);
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
                <div class="title-option ${title.title === profileData.current_title ? 'current' : ''}" 
                     onclick="selectTitle('${title.title}')">
                    <div class="title-name">${title.title}</div>
                    <div class="title-description">${title.description}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading titles:', error);
        titlesGrid.innerHTML = '<p class="error">Error loading titles</p>';
    }
}

function closeTitleModal() {
    document.getElementById('titleModal').style.display = 'none';
}

async function selectTitle(title) {
    try {
        const response = await fetch(`${API_URL}/users/title`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
        });

        if (response.ok) {
            showNotification('Title updated successfully!', 'success');
            document.getElementById('currentTitle').textContent = title;
            profileData.current_title = title;
            closeTitleModal();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to update title', 'error');
        }
    } catch (error) {
        console.error('Error updating title:', error);
        showNotification('Error updating title', 'error');
    }
}

// Export functions
window.switchTab = switchTab;
window.openTitleModal = openTitleModal;
window.closeTitleModal = closeTitleModal;
window.selectTitle = selectTitle;