// Quest Game JavaScript
const API_URL = 'http://localhost:3000/api';

// Game State
let gameState = {
    player: {
        id: null,
        name: '',
        level: 1,
        exp: 0,
        expToNext: 100,
        hp: 100,
        maxHp: 100,
        baseAtk: 10,
        baseDef: 5,
        weapon: null,
        skills: []
    },
    currentBattle: null,
    inBattle: false,
    floors: [],
    unlockedFloor: 1
};

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadPlayerData();
    loadEquippedItems();
    setupEventListeners();
    
    // Load floors after everything else is initialized
    setTimeout(() => {
        loadFloors();
    }, 100);
});

// Authentication check
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
}

// Load player data
async function loadPlayerData() {
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            gameState.player.id = data.user.id;
            gameState.player.name = data.user.username;
            gameState.player.level = data.user.level;
            gameState.player.exp = data.user.experience;
            
            // Update UI
            updatePlayerHUD();
        }
    } catch (error) {
        console.error('Error loading player data:', error);
    }
}

// Load equipped items from localStorage
function loadEquippedItems() {
    const equippedWeapon = localStorage.getItem('equippedWeapon');
    const equippedSkills = localStorage.getItem('equippedSkills');
    
    if (equippedWeapon) {
        gameState.player.weapon = JSON.parse(equippedWeapon);
        updateEquipmentDisplay();
    }
    
    if (equippedSkills) {
        gameState.player.skills = JSON.parse(equippedSkills);
        updateSkillButtons();
    }
}

// Update player HUD
function updatePlayerHUD() {
    document.getElementById('playerName').textContent = gameState.player.name;
    document.getElementById('playerLevel').textContent = gameState.player.level;
    
    // Calculate exp for next level
    gameState.player.expToNext = gameState.player.level * 100;
    const expPercentage = (gameState.player.exp / gameState.player.expToNext) * 100;
    
    document.getElementById('expFill').style.width = `${expPercentage}%`;
    document.getElementById('expText').textContent = `${gameState.player.exp}/${gameState.player.expToNext}`;
    
    // Update stats
    const totalAtk = gameState.player.baseAtk + (gameState.player.weapon ? gameState.player.weapon.attack : 0);
    const totalDef = gameState.player.baseDef + (gameState.player.weapon ? gameState.player.weapon.defense : 0);
    
    document.getElementById('playerAtk').textContent = totalAtk;
    document.getElementById('playerDef').textContent = totalDef;
    
    // Update HP
    updatePlayerHP();
}

// Update player HP display
function updatePlayerHP() {
    const hpPercentage = (gameState.player.hp / gameState.player.maxHp) * 100;
    document.getElementById('playerHpFill').style.width = `${hpPercentage}%`;
    document.getElementById('playerHpText').textContent = `${Math.ceil(gameState.player.hp)}/${gameState.player.maxHp}`;
}

// Load floors
function loadFloors() {
    // Get saved progress
    const savedFloor = localStorage.getItem('unlockedFloor');
    if (savedFloor) {
        gameState.unlockedFloor = parseInt(savedFloor);
    }
    
    // Generate floors based on initTables.js bosses
    const floorData = [
        // Easy Bosses
        { floor: 1, boss: 'Illfang the Kobold Lord', difficulty: 'easy', hp: 500 },
        { floor: 2, boss: 'Asterius the Taurus King', difficulty: 'easy', hp: 750 },
        { floor: 3, boss: 'Nerius the Evil Treant', difficulty: 'easy', hp: 1000 },
        { floor: 4, boss: 'Wythege the Hippocampus', difficulty: 'easy', hp: 1250 },
        { floor: 5, boss: 'Fuscus the Vacant Colossus', difficulty: 'easy', hp: 1500 },
        
        // Medium Bosses
        { floor: 6, boss: 'The Irrational Cube', difficulty: 'medium', hp: 2000 },
        { floor: 7, boss: 'Nato the Colonel Taurus', difficulty: 'medium', hp: 2500 },
        { floor: 8, boss: 'The Limitless Hydra', difficulty: 'medium', hp: 3000 },
        { floor: 9, boss: 'Kagachi the Samurai Lord', difficulty: 'medium', hp: 3500 },
        { floor: 10, boss: 'The Fatal Scythe', difficulty: 'medium', hp: 4000 },
        { floor: 12, boss: 'The Twisted Watcher', difficulty: 'medium', hp: 4500 },
        { floor: 15, boss: 'Dominus the Corrupt Noble', difficulty: 'medium', hp: 5000 },
        
        // Hard Bosses
        { floor: 20, boss: 'Nicholas the Renegade', difficulty: 'hard', hp: 6000 },
        { floor: 25, boss: 'The Skull Reaper', difficulty: 'hard', hp: 8000 },
        { floor: 30, boss: 'Baran the General Taurus', difficulty: 'hard', hp: 9000 },
        { floor: 35, boss: 'The Adamantine Golem', difficulty: 'hard', hp: 10000 },
        { floor: 40, boss: 'Laughing Coffin Leader', difficulty: 'hard', hp: 11000 },
        { floor: 50, boss: 'The Gleam Eyes', difficulty: 'hard', hp: 12000 },
        
        // Nightmare Bosses
        { floor: 75, boss: 'The Skull Reaper Elite', difficulty: 'nightmare', hp: 20000 },
        { floor: 100, boss: 'An Incarnation of the Radius', difficulty: 'nightmare', hp: 30000 }
    ];
    
    gameState.floors = floorData;
    renderFloors();
}

// Render floor selection
function renderFloors() {
    const floorGrid = document.getElementById('floorGrid');
    floorGrid.innerHTML = '';
    
    gameState.floors.forEach(floor => {
        const floorCard = document.createElement('div');
        floorCard.className = `floor-card ${floor.floor > gameState.unlockedFloor ? 'locked' : ''}`;
        floorCard.innerHTML = `
            <div class="floor-number">F${floor.floor}</div>
            <div class="floor-boss">${floor.boss}</div>
            <div class="floor-difficulty difficulty-${floor.difficulty}">${floor.difficulty.toUpperCase()}</div>
        `;
        
        if (floor.floor <= gameState.unlockedFloor) {
            floorCard.addEventListener('click', () => startBattle(floor));
        }
        
        floorGrid.appendChild(floorCard);
    });
}

// Start battle
function startBattle(floor) {
    gameState.currentBattle = {
        floor: floor.floor,
        boss: floor.boss,
        bossHp: floor.hp,
        bossMaxHp: floor.hp,
        difficulty: floor.difficulty,
        turn: 0,
        log: []
    };
    
    gameState.inBattle = true;
    gameState.player.hp = gameState.player.maxHp; // Reset player HP
    
    // Switch to battle screen
    document.getElementById('floorSelection').classList.add('hidden');
    document.getElementById('battleScreen').classList.remove('hidden');
    
    // Update battle UI
    document.getElementById('bossName').textContent = floor.boss;
    updateBossHP();
    updatePlayerHP();
    
    addBattleLog(`Battle started against ${floor.boss}!`, 'system-message');
}

// Update boss HP display
function updateBossHP() {
    const hpPercentage = (gameState.currentBattle.bossHp / gameState.currentBattle.bossMaxHp) * 100;
    document.getElementById('bossHpFill').style.width = `${hpPercentage}%`;
    document.getElementById('bossHpText').textContent = `${Math.ceil(gameState.currentBattle.bossHp)}/${gameState.currentBattle.bossMaxHp}`;
}

// Add message to battle log
function addBattleLog(message, className = '') {
    const battleLog = document.getElementById('battleLog');
    const p = document.createElement('p');
    p.textContent = message;
    if (className) p.className = className;
    battleLog.appendChild(p);
    battleLog.scrollTop = battleLog.scrollHeight;
}

// Update skill buttons
function updateSkillButtons() {
    const skillButtons = document.querySelectorAll('.skill-btn');
    
    skillButtons.forEach((btn, index) => {
        const skill = gameState.player.skills[index];
        const skillName = btn.querySelector('.skill-name');
        const skillCooldown = btn.querySelector('.skill-cooldown');
        
        if (skill) {
            skillName.textContent = skill.name;
            btn.disabled = false;
            btn.dataset.skillId = skill.id;
            
            // Add rarity color
            btn.style.borderColor = getRarityColor(skill.rarity);
        } else {
            skillName.textContent = `Skill ${index + 1}`;
            btn.disabled = true;
            btn.dataset.skillId = null;
        }
        
        skillCooldown.textContent = '';
    });
}

// Get rarity color
function getRarityColor(rarity) {
    const colors = {
        common: '#ffffff',
        uncommon: '#00ff00',
        rare: '#0080ff',
        epic: '#a335ee',
        legendary: '#ff8000'
    };
    return colors[rarity] || colors.common;
}

// Handle skill use
async function useSkill(skillSlot) {
    if (!gameState.inBattle || !gameState.player.skills[skillSlot]) return;
    
    const skill = gameState.player.skills[skillSlot];
    const btn = document.querySelector(`[data-skill-slot="${skillSlot}"]`);
    
    if (btn.disabled) return;
    
    // Disable button for cooldown
    btn.disabled = true;
    btn.classList.add('on-cooldown');
    
    // Calculate damage
    const weaponAtk = gameState.player.weapon ? gameState.player.weapon.attack : 0;
    const totalAtk = gameState.player.baseAtk + weaponAtk;
    const skillDamage = totalAtk * skill.damage_multiplier;
    const isCritical = Math.random() < skill.crit_chance;
    const finalDamage = isCritical ? skillDamage * 2 : skillDamage;
    
    // Apply damage
    gameState.currentBattle.bossHp -= finalDamage;
    
    // Show damage number
    showDamageNumber(finalDamage, 'player-damage', isCritical);
    
    // Add to battle log
    if (isCritical) {
        addBattleLog(`CRITICAL! ${skill.name} dealt ${Math.ceil(finalDamage)} damage!`, 'player-action');
    } else {
        addBattleLog(`${skill.name} dealt ${Math.ceil(finalDamage)} damage!`, 'player-action');
    }
    
    updateBossHP();
    
    // Check if boss is defeated
    if (gameState.currentBattle.bossHp <= 0) {
        victory();
        return;
    }
    
    // Boss turn
    setTimeout(() => bossTurn(), 1000);
    
    // Cooldown
    const cooldownTime = skill.cooldown * 1000;
    const cooldownDisplay = btn.querySelector('.skill-cooldown');
    let remainingTime = skill.cooldown;
    
    const cooldownInterval = setInterval(() => {
        remainingTime--;
        cooldownDisplay.textContent = `${remainingTime}s`;
        
        if (remainingTime <= 0) {
            clearInterval(cooldownInterval);
            btn.disabled = false;
            btn.classList.remove('on-cooldown');
            cooldownDisplay.textContent = '';
        }
    }, 1000);
}

// Boss turn
function bossTurn() {
    const difficultyMultipliers = {
        easy: 0.5,
        medium: 1,
        hard: 1.5,
        nightmare: 2
    };
    
    const baseDamage = 10 + (gameState.currentBattle.floor * 2);
    const damage = baseDamage * difficultyMultipliers[gameState.currentBattle.difficulty];
    const finalDamage = Math.max(1, damage - gameState.player.baseDef);
    
    gameState.player.hp -= finalDamage;
    
    showDamageNumber(finalDamage, 'boss-damage');
    addBattleLog(`${gameState.currentBattle.boss} dealt ${Math.ceil(finalDamage)} damage!`, 'boss-action');
    
    updatePlayerHP();
    
    if (gameState.player.hp <= 0) {
        defeat();
    }
}

// Show damage number animation
function showDamageNumber(damage, className, isCritical = false) {
    const battleArea = document.querySelector('.battle-area');
    const damageEl = document.createElement('div');
    damageEl.className = `damage-number ${className} ${isCritical ? 'critical' : ''}`;
    damageEl.textContent = Math.ceil(damage);
    
    // Random position near center
    damageEl.style.left = `${45 + Math.random() * 10}%`;
    damageEl.style.top = `${40 + Math.random() * 20}%`;
    
    battleArea.appendChild(damageEl);
    
    // Remove after animation
    setTimeout(() => damageEl.remove(), 1000);
}

// Victory
async function victory() {
    gameState.inBattle = false;
    
    // Calculate rewards
    const expGained = gameState.currentBattle.floor * 50;
    const colEarned = gameState.currentBattle.floor * 100;
    
    // Update player data
    gameState.player.exp += expGained;
    
    // Check for level up
    while (gameState.player.exp >= gameState.player.expToNext) {
        gameState.player.exp -= gameState.player.expToNext;
        gameState.player.level++;
        gameState.player.baseAtk += 2;
        gameState.player.baseDef += 1;
        gameState.player.maxHp += 10;
        addBattleLog(`LEVEL UP! You are now level ${gameState.player.level}!`, 'system-message');
    }
    
    // Unlock next floor
    if (gameState.currentBattle.floor >= gameState.unlockedFloor) {
        gameState.unlockedFloor = Math.min(gameState.currentBattle.floor + 1, 100);
    }
    
    // Show victory modal
    showResultModal(true, expGained, colEarned);
    
    // Save progress
    await saveProgress();
}

// Defeat
function defeat() {
    gameState.inBattle = false;
    showResultModal(false, 0, 0);
}

// Show result modal
function showResultModal(isVictory, expGained, colEarned) {
    const modal = document.getElementById('resultModal');
    const title = document.getElementById('resultTitle');
    
    title.textContent = isVictory ? 'Victory!' : 'Defeat...';
    title.className = `modal-title ${isVictory ? 'victory' : 'defeat'}`;
    
    document.getElementById('expGained').textContent = expGained;
    document.getElementById('colEarned').textContent = colEarned;
    
    // Random item drop chance for victory
    if (isVictory && Math.random() < 0.3) {
        const itemReward = document.getElementById('itemReward');
        itemReward.classList.remove('hidden');
        document.getElementById('itemName').textContent = generateRandomItem();
    }
    
    modal.classList.remove('hidden');
}

// Generate random item name
function generateRandomItem() {
    const prefixes = ['Ancient', 'Mystic', 'Shadow', 'Crystal', 'Divine'];
    const items = ['Sword', 'Shield', 'Armor', 'Ring', 'Amulet'];
    const suffixes = ['of Power', 'of Speed', 'of Protection', 'of Wisdom', 'of Courage'];
    
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${items[Math.floor(Math.random() * items.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
}

// Save progress
async function saveProgress() {
    try {
        // In a real app, this would save to the server
        localStorage.setItem('playerLevel', gameState.player.level);
        localStorage.setItem('playerExp', gameState.player.exp);
        localStorage.setItem('unlockedFloor', gameState.unlockedFloor);
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Update equipment display
function updateEquipmentDisplay() {
    const weaponSlot = document.getElementById('equippedWeapon');
    
    if (gameState.player.weapon) {
        weaponSlot.innerHTML = `
            <div class="weapon-info">
                <span class="weapon-name weapon-rarity-${gameState.player.weapon.rarity}">${gameState.player.weapon.name}</span>
                <span class="weapon-stats">ATK +${gameState.player.weapon.attack} DEF +${gameState.player.weapon.defense}</span>
            </div>
        `;
    } else {
        weaponSlot.innerHTML = '<span class="empty-slot">No weapon equipped</span>';
    }
    
    updatePlayerHUD();
}

// Setup event listeners
function setupEventListeners() {
    // Skill buttons
    document.querySelectorAll('.skill-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => useSkill(index));
    });
    
    // Flee button
    document.getElementById('fleeBtn').addEventListener('click', fleeBattle);
    
    // Continue button
    document.getElementById('continueBtn').addEventListener('click', () => {
        document.getElementById('resultModal').classList.add('hidden');
        document.getElementById('battleScreen').classList.add('hidden');
        document.getElementById('floorSelection').classList.remove('hidden');
        
        updatePlayerHUD();
        renderFloors();
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/login.html';
    });
}

// Flee battle
function fleeBattle() {
    if (confirm('Are you sure you want to flee? You will lose this battle.')) {
        defeat();
    }
}

// Load saved progress
function loadSavedProgress() {
    const savedLevel = localStorage.getItem('playerLevel');
    const savedExp = localStorage.getItem('playerExp');
    const savedFloor = localStorage.getItem('unlockedFloor');
    
    if (savedLevel) gameState.player.level = parseInt(savedLevel);
    if (savedExp) gameState.player.exp = parseInt(savedExp);
    if (savedFloor) gameState.unlockedFloor = parseInt(savedFloor);
    
    // Update stats based on level
    gameState.player.baseAtk = 10 + ((gameState.player.level - 1) * 2);
    gameState.player.baseDef = 5 + (gameState.player.level - 1);
    gameState.player.maxHp = 100 + ((gameState.player.level - 1) * 10);
    gameState.player.hp = gameState.player.maxHp;
}

// Initialize
loadSavedProgress();

// Make sure to export functions for debugging
window.gameState = gameState;
window.loadFloors = loadFloors;
window.renderFloors = renderFloors;