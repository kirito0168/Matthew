// Dashboard JavaScript

document.addEventListener('DOMContentLoaded', async () => {
    // Require authentication
    const user = await requireAuth();
    if (!user) return;

    // Load dashboard data
    await loadDashboardData(user);
});

async function loadDashboardData(user) {
    try {
        // Update player name
        document.getElementById('playerName').textContent = user.username;

        // Load player profile
        const profileResponse = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            updatePlayerStats(profileData.profile);
            updateOverviewStats(profileData.profile);
        }

        // Load recent activity
        loadRecentActivity();

        // Load achievement progress
        loadAchievementProgress();

        // Load latest vulnerabilities
        loadLatestVulnerabilities();

        // Load user rank
        loadUserRank();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

function updatePlayerStats(profile) {
    // Update stats
    document.getElementById('playerLevel').textContent = profile.level;
    document.getElementById('playerExp').textContent = profile.exp;
    document.getElementById('playerTitle').textContent = profile.current_title;

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

function updateOverviewStats(profile) {
    document.getElementById('bugsReported').textContent = profile.vulnerabilities_reported || 0;
    document.getElementById('bugsResolved').textContent = profile.vulnerabilities_resolved || 0;
    document.getElementById('questsCompleted').textContent = profile.quests_completed || 0;
    document.getElementById('reviewsGiven').textContent = profile.reviews_given || 0;

    // Animate numbers
    animateNumbers();
}

async function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const activities = data.profile.recentActivities || [];

            if (activities.length === 0) {
                activityList.innerHTML = '<p class="no-data">No recent activity</p>';
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
    } catch (error) {
        console.error('Error loading activity:', error);
        activityList.innerHTML = '<p class="error">Error loading activity</p>';
    }
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
            return `Defeated ${details.bossName || 'Boss'} (+${details.expReward} EXP)`;
        case 'achievement_unlocked':
            return `${details.achievementName || 'Achievement'} (+${details.expReward} EXP)`;
        case 'level_up':
            return `Reached Level ${details.newLevel || '?'}!`;
        default:
            return JSON.stringify(details);
    }
}

async function loadAchievementProgress() {
    const achievementList = document.getElementById('achievementList');
    
    try {
        const response = await fetch(`${API_URL}/achievements/progress`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const progress = data.progress;

            const achievementHTML = Object.entries(progress).map(([type, info]) => {
                const nextAchievement = info.achievements.find(a => !a.is_unlocked);
                if (!nextAchievement) return '';

                return `
                    <div class="achievement-item">
                        <div class="achievement-icon">${getAchievementIcon(type)}</div>
                        <div class="achievement-info">
                            <div class="achievement-name">${nextAchievement.name}</div>
                            <div class="achievement-progress-bar">
                                <div class="achievement-progress-fill" style="width: ${nextAchievement.progress}%"></div>
                            </div>
                            <div class="achievement-details">${info.current} / ${nextAchievement.requirement_value}</div>
                        </div>
                    </div>
                `;
            }).filter(html => html !== '').join('');

            achievementList.innerHTML = achievementHTML || '<p class="no-data">All achievements unlocked!</p>';
        }
    } catch (error) {
        console.error('Error loading achievements:', error);
        achievementList.innerHTML = '<p class="error">Error loading achievements</p>';
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

async function loadLatestVulnerabilities() {
    const vulnerabilitiesList = document.getElementById('vulnerabilitiesList');
    
    try {
        const response = await fetch(`${API_URL}/vulnerabilities?limit=5`);

        if (response.ok) {
            const data = await response.json();
            const vulnerabilities = data.vulnerabilities;

            if (vulnerabilities.length === 0) {
                vulnerabilitiesList.innerHTML = '<p class="no-data">No vulnerabilities reported yet</p>';
                return;
            }

            vulnerabilitiesList.innerHTML = vulnerabilities.map(vuln => `
                <div class="vulnerability-item">
                    <div>
                        <div class="vulnerability-title">${vuln.title}</div>
                        <div class="vulnerability-reporter">by ${vuln.reporter_name || 'Unknown'}</div>
                    </div>
                    <div class="vulnerability-severity severity-${vuln.severity}">${vuln.severity}</div>
                    <div class="vulnerability-status">${vuln.status}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading vulnerabilities:', error);
        vulnerabilitiesList.innerHTML = '<p class="error">Error loading vulnerabilities</p>';
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

function animateNumbers() {
    const numbers = document.querySelectorAll('.overview-number');
    numbers.forEach(num => {
        const target = parseInt(num.textContent);
        let current = 0;
        const increment = target / 30;
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