// Quests JavaScript

let currentFilter = 'all';
let currentQuest = null;
let battleInProgress = false;

document.addEventListener('DOMContentLoaded', async () => {
    // Require authentication
    const user = await requireAuth();
    if (!user) return;

    // Load quests
    await loadQuests();
});

async function loadQuests() {
    const questsGrid = document.getElementById('questsGrid');
    questsGrid.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch(`${API_URL}/quests`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayQuests(data.quests);
        }
    } catch (error) {
        console.error('Error loading quests:', error);
        questsGrid.innerHTML = '<p class="error">Error loading quests</p>';
    }
}

function displayQuests(quests) {
    const questsGrid = document.getElementById('questsGrid');
    
    // Filter quests
    let filteredQuests = quests;
    if (currentFilter !== 'all') {
        filteredQuests = quests.filter(quest => quest.difficulty === currentFilter);
    }

    if (filteredQuests.length === 0) {
        questsGrid.innerHTML = '<p class="no-data">No quests available</p>';
        return;
    }

    questsGrid.innerHTML = filteredQuests.map(quest => `
        <div class="quest-card ${quest.user_completed > 0 ? 'completed' : ''}" 
             onclick="${quest.user_completed > 0 ? '' : `startQuest(${quest.id})`}">
            <div class="quest-floor">
                <span class="floor-number">Floor ${quest.floor_number}</span>
                <span class="quest-difficulty difficulty-${quest.difficulty}">${quest.difficulty}</span>
            </div>
            <h3 class="boss-name">${quest.boss_name}</h3>
            <p class="quest-description">${quest.description}</p>
            <div class="quest-stats">
                <div class="stat-item">
                    <div class="stat-label">HP</div>
                    <div class="stat-value">${quest.health_points}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">EXP Reward</div>
                    <div class="stat-value">${quest.exp_reward}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Clears</div>
                    <div class="stat-value">${quest.total_clears}</div>
                </div>
            </div>
            <button class="quest-action" ${quest.user_completed > 0 ? 'disabled' : ''}>
                ${quest.user_completed > 0 ? 'CLEARED' : 'CHALLENGE BOSS'}
            </button>
        </div>
    `).join('');
}

function filterQuests(difficulty) {
    currentFilter = difficulty;
    
    // Update filter buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadQuests();
}

async function startQuest(questId) {
    if (battleInProgress) return;

    try {
        // Get quest details
        const response = await fetch(`${API_URL}/quests/${questId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentQuest = data.quest;
            openBattleModal();
        }
    } catch (error) {
        console.error('Error starting quest:', error);
        showNotification('Error starting quest', 'error');
    }
}

function openBattleModal() {
    const modal = document.getElementById('battleModal');
    modal.style.display = 'block';
    
    // Initialize battle UI
    document.getElementById('battleTitle').textContent = `Floor ${currentQuest.floor_number} Boss Battle`;
    document.getElementById('bossName').textContent = currentQuest.boss_name;
    document.getElementById('bossHpText').textContent = `${currentQuest.health_points}/${currentQuest.health_points}`;
    document.getElementById('playerHpText').textContent = '100/100';
    
    // Reset HP bars
    document.getElementById('bossHp').style.width = '100%';
    document.getElementById('playerHp').style.width = '100%';
    
    // Clear battle log
    document.getElementById('battleLog').innerHTML = '<p>Battle started! Choose your action!</p>';
    
    // Enable action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.disabled = false;
    });
    
    battleInProgress = false;
}

async function performAction(action) {
    if (battleInProgress || !currentQuest) return;
    
    battleInProgress = true;
    
    // Disable action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.disabled = true;
    });
    
    try {
        const response = await fetch(`${API_URL}/quests/${currentQuest.id}/attempt`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action })
        });

        if (response.ok) {
            const data = await response.json();
            displayBattleResult(data);
        }
    } catch (error) {
        console.error('Error in battle:', error);
        showNotification('Error during battle', 'error');
        battleInProgress = false;
    }
}

function displayBattleResult(result) {
    const battleLog = document.getElementById('battleLog');
    
    // Display battle log with animations
    let logIndex = 0;
    const logInterval = setInterval(() => {
        if (logIndex < result.battleLog.length) {
            const logEntry = result.battleLog[logIndex];
            const p = document.createElement('p');
            
            // Add special classes for different log types
            if (logEntry.includes('damage')) {
                p.className = 'damage-text';
            } else if (logEntry.includes('Critical')) {
                p.className = 'critical-text';
            } else if (logEntry.includes('Victory')) {
                p.className = 'heal-text';
            }
            
            p.textContent = logEntry;
            battleLog.appendChild(p);
            battleLog.scrollTop = battleLog.scrollHeight;
            
            // Update HP bars based on log
            updateHPBars(logEntry);
            
            logIndex++;
        } else {
            clearInterval(logInterval);
            
            // Handle battle end
            if (result.success) {
                handleVictory(result.rewards);
            } else {
                handleDefeat();
            }
        }
    }, 500);
}

function updateHPBars(logEntry) {
    // This is a simplified version - in a real game you'd parse the actual HP values
    if (logEntry.includes('Boss HP:')) {
        // Animate boss HP reduction
        const bossHp = document.getElementById('bossHp');
        const currentWidth = parseFloat(bossHp.style.width);
        bossHp.style.width = Math.max(0, currentWidth - 10) + '%';
    }
    
    if (logEntry.includes('Your HP:')) {
        // Animate player HP reduction
        const playerHp = document.getElementById('playerHp');
        const currentWidth = parseFloat(playerHp.style.width);
        playerHp.style.width = Math.max(0, currentWidth - 5) + '%';
    }
}

function handleVictory(rewards) {
    // Show victory effects
    showQuestComplete(currentQuest.boss_name, rewards.exp);
    showSkillActivation();
    
    // Update UI
    const battleLog = document.getElementById('battleLog');
    const victoryMessage = document.createElement('p');
    victoryMessage.className = 'heal-text';
    victoryMessage.style.fontSize = '1.2rem';
    victoryMessage.textContent = `🎉 QUEST COMPLETE! +${rewards.exp} EXP 🎉`;
    battleLog.appendChild(victoryMessage);
    
    // Reload quests to update completion status
    setTimeout(() => {
        loadQuests();
    }, 2000);
}

function handleDefeat() {
    const battleLog = document.getElementById('battleLog');
    const defeatMessage = document.createElement('p');
    defeatMessage.className = 'damage-text';
    defeatMessage.style.fontSize = '1.2rem';
    defeatMessage.textContent = '💀 DEFEAT! Try again! 💀';
    battleLog.appendChild(defeatMessage);
    
    // Re-enable action buttons
    setTimeout(() => {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.disabled = false;
        });
        battleInProgress = false;
    }, 2000);
}

function closeBattle() {
    document.getElementById('battleModal').style.display = 'none';
    currentQuest = null;
    battleInProgress = false;
}

// Export functions
window.filterQuests = filterQuests;
window.startQuest = startQuest;
window.performAction = performAction;
window.closeBattle = closeBattle;