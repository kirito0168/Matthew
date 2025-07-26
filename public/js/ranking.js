// Ranking JavaScript

let currentTab = 'overall';
let currentPage = 1;
const itemsPerPage = 20;

document.addEventListener('DOMContentLoaded', async () => {
    // Load rankings
    await loadRankings();
});

async function loadRankings() {
    const rankingsList = document.getElementById('rankingsList');
    rankingsList.innerHTML = '<div class="loading-spinner"></div>';

    try {
        let url = '';
        
        if (currentTab === 'overall') {
            url = `${API_URL}/rankings?page=${currentPage}&limit=${itemsPerPage}`;
        } else {
            url = `${API_URL}/rankings/category/${currentTab}?page=${currentPage}&limit=${itemsPerPage}`;
        }

        const response = await fetch(url);

        if (response.ok) {
            const data = await response.json();
            displayRankings(data.rankings, currentTab);
            displayPagination(data.pagination);
        }
    } catch (error) {
        console.error('Error loading rankings:', error);
        rankingsList.innerHTML = '<p class="error">Error loading rankings</p>';
    }
}

function displayRankings(rankings, category) {
    const rankingsList = document.getElementById('rankingsList');

    if (rankings.length === 0) {
        rankingsList.innerHTML = '<p class="no-data">No rankings available</p>';
        return;
    }

    // Create ranking table
    let tableHTML = `
        <div class="ranking-table">
            <div class="ranking-header-row">
                <div class="rank-col">Rank</div>
                <div class="player-col">Player</div>
                <div class="level-col">Level</div>
                ${getAdditionalColumns(category)}
                <div class="score-col">Score</div>
            </div>
    `;

    rankings.forEach((player, index) => {
        const isCurrentUser = localStorage.getItem('user') && 
                            player.id === JSON.parse(localStorage.getItem('user') || '{}').id;
        
        tableHTML += `
            <div class="ranking-row ${isCurrentUser ? 'current-user' : ''} ${index < 3 ? 'top-player' : ''}">
                <div class="rank-col">
                    ${player.rank <= 3 ? getRankMedal(player.rank) : `#${player.rank}`}
                </div>
                <div class="player-col">
                    <img src="${player.avatar_url || 'images/default-avatar.png'}" alt="Avatar" class="player-avatar">
                    <div class="player-info">
                        <div class="player-name">${player.username}</div>
                        <div class="player-title">${player.current_title}</div>
                    </div>
                </div>
                <div class="level-col">
                    <span class="level-badge">Lv.${player.level}</span>
                </div>
                ${getAdditionalData(player, category)}
                <div class="score-col">
                    <span class="score-value">${getScore(player, category)}</span>
                </div>
            </div>
        `;
    });

    tableHTML += '</div>';
    rankingsList.innerHTML = tableHTML;

    // Add entrance animations
    const rows = document.querySelectorAll('.ranking-row');
    rows.forEach((row, index) => {
        row.style.animation = `slideInLeft 0.5s ease-out ${index * 0.05}s backwards`;
    });
}

function getAdditionalColumns(category) {
    switch (category) {
        case 'vulnerabilities':
            return '<div class="stat-col">Reported</div><div class="stat-col">Resolved</div>';
        case 'quests':
            return '<div class="stat-col">Quests</div><div class="stat-col">Total DMG</div>';
        case 'achievements':
            return '<div class="stat-col">Achievements</div>';
        default:
            return '<div class="stat-col">Bugs</div><div class="stat-col">Quests</div>';
    }
}

function getAdditionalData(player, category) {
    switch (category) {
        case 'vulnerabilities':
            return `
                <div class="stat-col">${player.vulnerabilities_reported || 0}</div>
                <div class="stat-col">${player.vulnerabilities_resolved || 0}</div>
            `;
        case 'quests':
            return `
                <div class="stat-col">${player.quests_completed || 0}</div>
                <div class="stat-col">${formatNumber(player.total_damage || 0)}</div>
            `;
        case 'achievements':
            return `
                <div class="stat-col">${player.achievements_unlocked || 0}</div>
            `;
        default:
            return `
                <div class="stat-col">${player.vulnerabilities_reported || 0}</div>
                <div class="stat-col">${player.quests_completed || 0}</div>
            `;
    }
}

function getScore(player, category) {
    switch (category) {
        case 'overall':
            return formatNumber(player.total_score || 0);
        default:
            return formatNumber(player.score || 0);
    }
}

function getRankMedal(rank) {
    const medals = {
        1: '<span class="rank-medal gold">🥇</span>',
        2: '<span class="rank-medal silver">🥈</span>',
        3: '<span class="rank-medal bronze">🥉</span>'
    };
    return medals[rank] || `#${rank}`;
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    
    if (pagination.totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let html = '<div class="pagination-controls">';
    
    if (pagination.page > 1) {
        html += `<button class="page-btn" onclick="changePage(${pagination.page - 1})">Previous</button>`;
    }

    // Show limited page numbers
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);

    if (startPage > 1) {
        html += `<button class="page-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) html += '<span>...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === pagination.page) {
            html += `<span class="page-current">${i}</span>`;
        } else {
            html += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
        }
    }

    if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) html += '<span>...</span>';
        html += `<button class="page-btn" onclick="changePage(${pagination.totalPages})">${pagination.totalPages}</button>`;
    }

    if (pagination.page < pagination.totalPages) {
        html += `<button class="page-btn" onclick="changePage(${pagination.page + 1})">Next</button>`;
    }

    html += '</div>';
    paginationDiv.innerHTML = html;
}

function switchRankingTab(tab) {
    currentTab = tab;
    currentPage = 1;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadRankings();
}

function changePage(page) {
    currentPage = page;
    loadRankings();
}

// Add ranking-specific styles
const style = document.createElement('style');
style.textContent = `
.rankings-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

.rankings-header {
    text-align: center;
    margin-bottom: 3rem;
}

.ranking-tabs {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
}

.ranking-table {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
}

.ranking-header-row {
    display: grid;
    grid-template-columns: 80px 1fr 100px auto 120px;
    padding: 1rem;
    background: rgba(0, 212, 255, 0.1);
    border-bottom: 2px solid var(--primary-color);
    font-weight: bold;
    color: var(--primary-color);
}

.ranking-row {
    display: grid;
    grid-template-columns: 80px 1fr 100px auto 120px;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    transition: all 0.3s ease;
}

.ranking-row:hover {
    background: rgba(0, 212, 255, 0.05);
}

.ranking-row.current-user {
    background: rgba(0, 212, 255, 0.1);
    border: 2px solid var(--primary-color);
}

.ranking-row.top-player {
    background: rgba(255, 217, 61, 0.05);
}

.rank-col {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.2rem;
}

.rank-medal {
    font-size: 2rem;
}

.player-col {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.player-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid var(--primary-color);
}

.player-name {
    font-weight: bold;
    color: var(--text-primary);
}

.player-title {
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.level-col {
    display: flex;
    align-items: center;
    justify-content: center;
}

.level-badge {
    background: var(--primary-color);
    color: var(--dark-bg);
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-weight: bold;
}

.stat-col {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
}

.score-col {
    display: flex;
    align-items: center;
    justify-content: center;
}

.score-value {
    font-size: 1.2rem;
    font-weight: bold;
    color: var(--accent-color);
}

@media (max-width: 768px) {
    .ranking-header-row,
    .ranking-row {
        grid-template-columns: 60px 1fr 80px;
    }
    
    .stat-col {
        display: none;
    }
}
`;
document.head.appendChild(style);

// Export functions
window.switchRankingTab = switchRankingTab;
window.changePage = changePage;