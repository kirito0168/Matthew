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
    watchWeaponChanges(); // Add weapon change monitoring
    
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

// Load equipped items from localStorage - UPDATED WITH WEAPON SYNC
function loadEquippedItems() {
    // Try to load weapon from the new blacksmith system first
    const weaponInventory = localStorage.getItem('weaponInventory');
    const equippedWeaponId = localStorage.getItem('equippedWeaponId');
    
    if (weaponInventory && equippedWeaponId) {
        // Load from blacksmith system
        const inventory = JSON.parse(weaponInventory);
        const equippedWeapon = inventory.find(w => w.id == equippedWeaponId);
        
        if (equippedWeapon) {
            gameState.player.weapon = equippedWeapon;
            updateEquipmentDisplay();
        }
    } else {
        // Fallback to old system
        const equippedWeapon = localStorage.getItem('equippedWeapon');
        if (equippedWeapon) {
            gameState.player.weapon = JSON.parse(equippedWeapon);
            updateEquipmentDisplay();
        }
    }
    
    // Load skills
    const equippedSkills = localStorage.getItem('equippedSkills');
    if (equippedSkills) {
        gameState.player.skills = JSON.parse(equippedSkills);
        updateSkillButtons();
    }
}

// Watch for weapon changes - NEW FUNCTION
function watchWeaponChanges() {
    // Listen for storage changes from other tabs/pages
    window.addEventListener('storage', (e) => {
        if (e.key === 'equippedWeaponId' || e.key === 'weaponInventory' || e.key === 'equippedWeapon') {
            loadEquippedItems();
            updatePlayerHUD();
        }
    });
    
    // Check for weapon changes every second (for same tab updates)
    setInterval(() => {
        const currentWeaponId = localStorage.getItem('equippedWeaponId');
        const currentWeapon = gameState.player.weapon;
        
        // If weapon ID changed, reload equipment
        if ((!currentWeaponId && currentWeapon) || 
            (currentWeaponId && (!currentWeapon || currentWeapon.id != currentWeaponId))) {
            loadEquippedItems();
            updatePlayerHUD();
        }
    }, 1000);
}

// Update player HUD - UPDATED WITH WEAPON BONUSES
function updatePlayerHUD() {
    document.getElementById('playerName').textContent = gameState.player.name;
    document.getElementById('playerLevel').textContent = gameState.player.level;
    
    // Calculate exp for next level
    gameState.player.expToNext = gameState.player.level * 100;
    const expPercentage = (gameState.player.exp / gameState.player.expToNext) * 100;
    
    document.getElementById('expFill').style.width = `${expPercentage}%`;
    document.getElementById('expText').textContent = `${gameState.player.exp}/${gameState.player.expToNext}`;
    
    // Update stats with weapon bonuses
    const weaponAtk = gameState.player.weapon ? gameState.player.weapon.attack : 0;
    const weaponDef = gameState.player.weapon ? gameState.player.weapon.defense : 0;
    
    const totalAtk = gameState.player.baseAtk + weaponAtk;
    const totalDef = gameState.player.baseDef + weaponDef;
    
    document.getElementById('playerAtk').textContent = totalAtk;
    document.getElementById('playerDef').textContent = totalDef;
    
    // Show weapon bonus in parentheses if equipped
    if (gameState.player.weapon) {
        document.getElementById('playerAtk').innerHTML = `${totalAtk} <span style="color: #00ff00; font-size: 0.9em;">(+${weaponAtk})</span>`;
        document.getElementById('playerDef').innerHTML = `${totalDef} <span style="color: #00ff00; font-size: 0.9em;">(+${weaponDef})</span>`;
    }
    
    // Update HP
    updatePlayerHP();
}

// Update player HP display
function updatePlayerHP() {
    const hpPercentage = (gameState.player.hp / gameState.player.maxHp) * 100;
    document.getElementById('playerHpFill').style.width = `${hpPercentage}%`;
    document.getElementById('playerHpText').textContent = `${Math.ceil(gameState.player.hp)}/${gameState.player.maxHp}`;
}

// Update equipment display - UPDATED VERSION
function updateEquipmentDisplay() {
    const weaponSlot = document.getElementById('equippedWeapon');
    
    if (gameState.player.weapon) {
        const weapon = gameState.player.weapon;
        weaponSlot.innerHTML = `
            <div class="weapon-info">
                <div class="weapon-icon" style="font-size: 1.5rem;">${weapon.icon || '⚔️'}</div>
                <span class="weapon-name weapon-rarity-${weapon.rarity}">${weapon.name}</span>
                <span class="weapon-stats">ATK +${weapon.attack} DEF +${weapon.defense}</span>
                ${weapon.special ? `<span class="weapon-special">${weapon.special}</span>` : ''}
            </div>
        `;
    } else {
        weaponSlot.innerHTML = '<span class="empty-slot">No weapon equipped</span>';
    }
    
    updatePlayerHUD();
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
    clearBattleLog();
    
    addBattleLog(`Floor ${floor.floor} Boss Battle Started!`, 'system');
    addBattleLog(`${floor.boss} appears!`, 'system');
    
    // Update skill buttons
    updateSkillButtons();
}

// Update boss HP
function updateBossHP() {
    const hpPercentage = (gameState.currentBattle.bossHp / gameState.currentBattle.bossMaxHp) * 100;
    document.getElementById('bossHpFill').style.width = `${hpPercentage}%`;
    document.getElementById('bossHpText').textContent = `${Math.ceil(gameState.currentBattle.bossHp)}/${gameState.currentBattle.bossMaxHp}`;
}

// Clear battle log
function clearBattleLog() {
    document.getElementById('battleLog').innerHTML = '';
}

// Add to battle log
function addBattleLog(message, type = 'normal') {
    const log = document.getElementById('battleLog');
    const entry = document.createElement('p');
    entry.className = type;
    entry.textContent = message;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// Update skill buttons
function updateSkillButtons() {
    const skillButtons = document.querySelectorAll('.skill-btn');
    
    skillButtons.forEach((btn, index) => {
        if (gameState.player.skills[index]) {
            const skill = gameState.player.skills[index];
            btn.innerHTML = `
                <span class="skill-name">${skill.name}</span>
                <span class="skill-cooldown"></span>
            `;
            btn.disabled = false;
            btn.setAttribute('data-skill-index', index);
        } else {
            btn.innerHTML = `
                <span class="skill-name">Empty Slot</span>
            `;
            btn.disabled = true;
        }
    });
}

// Use skill
async function useSkill(index) {
    if (!gameState.inBattle || !gameState.player.skills[index]) return;
    
    const skill = gameState.player.skills[index];
    const weaponAtk = gameState.player.weapon ? gameState.player.weapon.attack : 0;
    const totalAtk = gameState.player.baseAtk + weaponAtk;
    
    // Calculate damage
    const baseDamage = totalAtk * skill.damage_multiplier;
    const critRoll = Math.random();
    const isCrit = critRoll < skill.crit_chance;
    const damage = Math.floor(isCrit ? baseDamage * 2 : baseDamage);
    
    // Apply damage
    gameState.currentBattle.bossHp -= damage;
    
    // Log the attack
    addBattleLog(`You used ${skill.name}!`, 'player-action');
    if (isCrit) {
        addBattleLog(`CRITICAL HIT! ${damage} damage!`, 'player-action');
    } else {
        addBattleLog(`Dealt ${damage} damage!`, 'player-action');
    }
    
    updateBossHP();
    
    // Check if boss is defeated
    if (gameState.currentBattle.bossHp <= 0) {
        victory();
        return;
    }
    
    // Boss counter attack
    setTimeout(() => bossAttack(), 1000);
}

// Boss attack
function bossAttack() {
    const bossDamage = Math.floor(20 + (gameState.currentBattle.floor * 2));
    const weaponDef = gameState.player.weapon ? gameState.player.weapon.defense : 0;
    const totalDef = gameState.player.baseDef + weaponDef;
    
    const actualDamage = Math.max(1, bossDamage - totalDef);
    gameState.player.hp -= actualDamage;
    
    addBattleLog(`${gameState.currentBattle.boss} attacks!`, 'boss-action');
    addBattleLog(`You took ${actualDamage} damage!`, 'boss-action');
    
    updatePlayerHP();
    
    // Check if player is defeated
    if (gameState.player.hp <= 0) {
        defeat();
    }
}

// Victory
async function victory() {
    gameState.inBattle = false;
    
    addBattleLog(`${gameState.currentBattle.boss} defeated!`, 'system');
    
    // Calculate rewards
    const expReward = 100 * gameState.currentBattle.floor;
    const colReward = 500 * gameState.currentBattle.floor;
    
    addBattleLog(`Victory! +${expReward} EXP, +${colReward} Col`, 'system');
    
    // Update player stats
    gameState.player.exp += expReward;
    
    // Check for level up
    while (gameState.player.exp >= gameState.player.expToNext) {
        gameState.player.exp -= gameState.player.expToNext;
        gameState.player.level++;
        gameState.player.baseAtk += 2;
        gameState.player.baseDef += 1;
        gameState.player.maxHp += 10;
        gameState.player.hp = gameState.player.maxHp;
        
        addBattleLog(`LEVEL UP! You are now level ${gameState.player.level}!`, 'system');
    }
    
    // Update currency
    const currentCol = parseInt(localStorage.getItem('playerCol') || '0');
    localStorage.setItem('playerCol', currentCol + colReward);
    
    // Unlock next floor
    if (gameState.currentBattle.floor === gameState.unlockedFloor) {
        gameState.unlockedFloor++;
        localStorage.setItem('unlockedFloor', gameState.unlockedFloor);
    }
    
    // Save progress
    saveProgress();
    updatePlayerHUD();
    
    // Show results
    setTimeout(() => {
        document.getElementById('resultTitle').textContent = 'Victory!';
        document.getElementById('resultTitle').className = 'modal-title victory';
        document.getElementById('expGained').textContent = `+${expReward}`;
        document.getElementById('colEarned').textContent = `+${colReward}`;
        document.getElementById('resultModal').classList.remove('hidden');
    }, 2000);
}

// Defeat
function defeat() {
    gameState.inBattle = false;
    
    addBattleLog('You have been defeated...', 'system');
    
    // Show defeat modal
    setTimeout(() => {
        document.getElementById('resultTitle').textContent = 'Defeat';
        document.getElementById('resultTitle').className = 'modal-title defeat';
        document.getElementById('expGained').textContent = '0';
        document.getElementById('colEarned').textContent = '0';
        document.getElementById('resultModal').classList.remove('hidden');
    }, 2000);
}

// Save progress
function saveProgress() {
    try {
        // In a real app, this would save to the server
        localStorage.setItem('playerLevel', gameState.player.level);
        localStorage.setItem('playerExp', gameState.player.exp);
        localStorage.setItem('unlockedFloor', gameState.unlockedFloor);
    } catch (error) {
        console.error('Error saving progress:', error);
    }
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