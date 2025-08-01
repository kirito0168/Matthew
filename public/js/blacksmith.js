// Blacksmith JavaScript
const API_URL = 'http://localhost:3000/api';

// Game State
let gameState = {
    col: 10000,
    crystals: 50,
    inventory: [],
    equippedWeaponId: null, // Store ID instead of object reference
    selectedWeapon: null,
    filterType: 'all'
};

// Weapon Database
const weaponDatabase = {
    common: [
        { name: 'Iron Sword', attack: 5, defense: 2, icon: '⚔️' },
        { name: 'Wooden Shield', attack: 2, defense: 5, icon: '🛡️' },
        { name: 'Bronze Dagger', attack: 4, defense: 1, icon: '🗡️' },
        { name: 'Leather Armor', attack: 1, defense: 6, icon: '🎽' },
        { name: 'Simple Bow', attack: 6, defense: 0, icon: '🏹' }
    ],
    uncommon: [
        { name: 'Steel Blade', attack: 10, defense: 4, icon: '⚔️' },
        { name: 'Knight Shield', attack: 4, defense: 10, icon: '🛡️' },
        { name: 'Assassin\'s Knife', attack: 12, defense: 2, icon: '🗡️' },
        { name: 'Chain Mail', attack: 3, defense: 12, icon: '🎽' },
        { name: 'Hunter\'s Bow', attack: 13, defense: 1, icon: '🏹' }
    ],
    rare: [
        { name: 'Mithril Sword', attack: 20, defense: 8, icon: '⚔️' },
        { name: 'Tower Shield', attack: 8, defense: 20, icon: '🛡️' },
        { name: 'Shadow Blade', attack: 25, defense: 5, icon: '🗡️' },
        { name: 'Dragon Scale Armor', attack: 5, defense: 25, icon: '🎽' },
        { name: 'Elven Bow', attack: 22, defense: 3, icon: '🏹' }
    ],
    epic: [
        { name: 'Excalibur', attack: 35, defense: 15, icon: '⚔️' },
        { name: 'Aegis Shield', attack: 15, defense: 35, icon: '🛡️' },
        { name: 'Void Dagger', attack: 40, defense: 10, icon: '🗡️' },
        { name: 'Celestial Armor', attack: 10, defense: 40, icon: '🎽' },
        { name: 'Phoenix Bow', attack: 38, defense: 7, icon: '🏹' }
    ],
    legendary: [
        { name: 'Elucidator', attack: 50, defense: 25, icon: '⚔️', special: 'Dual Wield' },
        { name: 'Dark Repulser', attack: 48, defense: 27, icon: '⚔️', special: 'Parry Master' },
        { name: 'Lambent Light', attack: 55, defense: 20, icon: '🗡️', special: 'Holy Damage' },
        { name: 'Blackwyrm Coat', attack: 20, defense: 55, icon: '🎽', special: 'HP Regen' },
        { name: 'Hecate', attack: 60, defense: 15, icon: '🏹', special: 'Pierce' }
    ]
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadGameState();
    updateCurrencyDisplay();
    loadInventory();
    updateEquippedWeapon();
    setupEventListeners();
});

// Load game state from localStorage
function loadGameState() {
    const savedCol = localStorage.getItem('playerCol');
    const savedCrystals = localStorage.getItem('playerCrystals');
    const savedInventory = localStorage.getItem('weaponInventory');
    const savedEquippedId = localStorage.getItem('equippedWeaponId');
    
    if (savedCol) gameState.col = parseInt(savedCol);
    if (savedCrystals) gameState.crystals = parseInt(savedCrystals);
    if (savedInventory) {
        gameState.inventory = JSON.parse(savedInventory);
        // Reset all equipped states
        gameState.inventory.forEach(weapon => {
            weapon.equipped = false;
        });
    }
    if (savedEquippedId) {
        gameState.equippedWeaponId = savedEquippedId;
        // Find and mark the equipped weapon
        const equippedWeapon = gameState.inventory.find(w => w.id == savedEquippedId);
        if (equippedWeapon) {
            equippedWeapon.equipped = true;
        }
    }
}

// Save game state - UPDATED WITH WEAPON SYNC
function saveGameState() {
    localStorage.setItem('playerCol', gameState.col);
    localStorage.setItem('playerCrystals', gameState.crystals);
    localStorage.setItem('weaponInventory', JSON.stringify(gameState.inventory));
    
    if (gameState.equippedWeaponId) {
        localStorage.setItem('equippedWeaponId', gameState.equippedWeaponId);
        
        // Also save the full weapon object for quest game compatibility
        const equippedWeapon = getEquippedWeapon();
        if (equippedWeapon) {
            localStorage.setItem('equippedWeapon', JSON.stringify(equippedWeapon));
        }
    } else {
        localStorage.removeItem('equippedWeaponId');
        localStorage.removeItem('equippedWeapon');
    }
}

// Get currently equipped weapon object
function getEquippedWeapon() {
    if (!gameState.equippedWeaponId) return null;
    return gameState.inventory.find(w => w.id == gameState.equippedWeaponId);
}

// Update currency display
function updateCurrencyDisplay() {
    document.getElementById('colAmount').textContent = gameState.col.toLocaleString();
    document.getElementById('crystalAmount').textContent = gameState.crystals;
}

// Pull weapon gacha
async function pullWeapon(type, count = 1) {
    const costs = {
        basic: { col: 1000, crystal: 0 },
        premium: { col: 0, crystal: 10 }
    };
    
    const totalCost = {
        col: costs[type].col * count * (count === 10 ? 0.9 : 1), // 10% discount for 10x
        crystal: costs[type].crystal * count * (count === 10 ? 0.9 : 1)
    };
    
    // Check if player has enough currency
    if (gameState.col < totalCost.col || gameState.crystals < totalCost.crystal) {
        showNotification('Insufficient funds!', 'error');
        return;
    }
    
    // Deduct currency
    gameState.col -= Math.floor(totalCost.col);
    gameState.crystals -= Math.floor(totalCost.crystal);
    updateCurrencyDisplay();
    
    // Show pull animation
    showPullAnimation();
    
    // Perform pulls
    const results = [];
    for (let i = 0; i < count; i++) {
        results.push(performSinglePull(type));
    }
    
    // Add to inventory
    gameState.inventory.push(...results);
    
    // Show results
    setTimeout(() => {
        showPullResults(results);
        saveGameState();
        loadInventory();
    }, 2000);
}

// Perform single weapon pull
function performSinglePull(type) {
    const rates = {
        basic: {
            common: 60,
            uncommon: 30,
            rare: 9,
            epic: 1,
            legendary: 0
        },
        premium: {
            common: 0,
            uncommon: 50,
            rare: 35,
            epic: 12,
            legendary: 3
        }
    };
    
    const roll = Math.random() * 100;
    let rarity;
    let cumulative = 0;
    
    for (const [r, rate] of Object.entries(rates[type])) {
        cumulative += rate;
        if (roll < cumulative) {
            rarity = r;
            break;
        }
    }
    
    // Get random weapon from rarity pool
    const pool = weaponDatabase[rarity];
    const weapon = pool[Math.floor(Math.random() * pool.length)];
    
    return {
        ...weapon,
        rarity,
        id: Date.now() + Math.random(), // Unique ID
        level: 1,
        equipped: false
    };
}

// Show pull animation
function showPullAnimation() {
    const modal = document.getElementById('pullResultModal');
    const animation = document.getElementById('pullAnimation');
    const results = document.getElementById('pullResults');
    
    modal.classList.remove('hidden');
    animation.classList.remove('hidden');
    results.classList.add('hidden');
}

// Show pull results
function showPullResults(weapons) {
    const animation = document.getElementById('pullAnimation');
    const results = document.getElementById('pullResults');
    const weaponResults = document.getElementById('weaponResults');
    
    animation.classList.add('hidden');
    results.classList.remove('hidden');
    
    weaponResults.innerHTML = weapons.map(weapon => `
        <div class="result-weapon rarity-${weapon.rarity}">
            <div class="weapon-icon">${weapon.icon}</div>
            <div class="weapon-name">${weapon.name}</div>
            <div class="weapon-stats">ATK +${weapon.attack} DEF +${weapon.defense}</div>
        </div>
    `).join('');
}

// Close pull modal
function closePullModal() {
    document.getElementById('pullResultModal').classList.add('hidden');
}

// Load inventory
function loadInventory() {
    const grid = document.getElementById('inventoryGrid');
    const filteredInventory = gameState.filterType === 'all' 
        ? gameState.inventory 
        : gameState.inventory.filter(w => w.rarity === gameState.filterType);
    
    if (filteredInventory.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No weapons found</p>';
        return;
    }
    
    grid.innerHTML = filteredInventory.map(weapon => `
        <div class="weapon-card rarity-${weapon.rarity} ${gameState.selectedWeapon && gameState.selectedWeapon.id === weapon.id ? 'selected' : ''}" onclick="selectWeapon('${weapon.id}')">
            <div class="weapon-icon">${weapon.icon}</div>
            <div class="weapon-name">${weapon.name}</div>
            <div class="weapon-stats">ATK +${weapon.attack} DEF +${weapon.defense}</div>
            ${weapon.equipped ? '<div class="equipped-badge">EQUIPPED</div>' : ''}
        </div>
    `).join('');
}

// Select weapon
function selectWeapon(weaponId) {
    const weapon = gameState.inventory.find(w => w.id == weaponId);
    if (!weapon) return;
    
    gameState.selectedWeapon = weapon;
    
    // Update UI
    loadInventory();
    
    // Enable/disable equip button
    const equipBtn = document.getElementById('inventoryEquipBtn');
    equipBtn.disabled = weapon.equipped;
    equipBtn.textContent = weapon.equipped ? 'Already Equipped' : 'Equip Selected';
}

// Equip selected weapon - UPDATED WITH WEAPON SYNC
function equipSelectedWeapon() {
    if (!gameState.selectedWeapon || gameState.selectedWeapon.equipped) return;
    
    // Unequip current weapon
    if (gameState.equippedWeaponId) {
        const currentEquipped = gameState.inventory.find(w => w.id == gameState.equippedWeaponId);
        if (currentEquipped) {
            currentEquipped.equipped = false;
        }
    }
    
    // Equip selected weapon
    gameState.selectedWeapon.equipped = true;
    gameState.equippedWeaponId = gameState.selectedWeapon.id;
    
    saveGameState(); // This now also updates equippedWeapon
    updateEquippedWeapon();
    loadInventory();
    
    showNotification(`${gameState.selectedWeapon.name} equipped!`, 'success');
}

// Unequip current weapon - UPDATED WITH WEAPON SYNC
function unequipCurrentWeapon() {
    const currentEquipped = getEquippedWeapon();
    if (!currentEquipped) {
        showNotification('No weapon equipped!', 'error');
        return;
    }
    
    const weaponName = currentEquipped.name;
    currentEquipped.equipped = false;
    gameState.equippedWeaponId = null;
    
    saveGameState(); // This now also updates equippedWeapon
    updateEquippedWeapon();
    loadInventory();
    
    // Reset equip button
    const equipBtn = document.getElementById('inventoryEquipBtn');
    if (gameState.selectedWeapon) {
        equipBtn.disabled = false;
        equipBtn.textContent = 'Equip Selected';
    }
    
    showNotification(`${weaponName} unequipped!`, 'success');
}

// Filter inventory
function filterInventory(type) {
    gameState.filterType = type;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadInventory();
}

// Show weapon details
function showWeaponDetails(weaponId) {
    const weapon = gameState.inventory.find(w => w.id == weaponId);
    if (!weapon) return;
    
    gameState.selectedWeapon = weapon;
    
    const modal = document.getElementById('weaponDetailsModal');
    document.getElementById('modalWeaponName').textContent = weapon.name;
    document.getElementById('modalWeaponRarity').textContent = weapon.rarity.toUpperCase();
    document.getElementById('modalWeaponRarity').className = `weapon-rarity rarity-${weapon.rarity}`;
    document.getElementById('modalWeaponAtk').textContent = `+${weapon.attack}`;
    document.getElementById('modalWeaponDef').textContent = `+${weapon.defense}`;
    document.getElementById('modalWeaponSpecial').textContent = weapon.special || 'None';
    
    const descriptions = {
        common: 'A basic weapon forged by apprentice blacksmiths.',
        uncommon: 'A well-crafted weapon with enhanced capabilities.',
        rare: 'A finely forged weapon imbued with special materials.',
        epic: 'A masterwork weapon created by legendary smiths.',
        legendary: 'A weapon of legend, containing incredible power.'
    };
    
    document.getElementById('modalWeaponDesc').textContent = descriptions[weapon.rarity];
    
    // Update equip button
    const equipBtn = document.getElementById('equipBtn');
    if (weapon.equipped) {
        equipBtn.textContent = 'Unequip';
        equipBtn.style.background = 'rgba(255, 100, 100, 0.2)';
        equipBtn.style.border = '2px solid #ff6666';
        equipBtn.style.color = '#ff6666';
    } else {
        equipBtn.textContent = 'Equip';
        equipBtn.style.background = 'var(--primary-color)';
        equipBtn.style.border = 'none';
        equipBtn.style.color = 'var(--dark-bg)';
    }
    
    modal.classList.remove('hidden');
}

// Close details modal
function closeDetailsModal() {
    document.getElementById('weaponDetailsModal').classList.add('hidden');
}

// Equip/Unequip weapon from modal - UPDATED WITH WEAPON SYNC
function equipWeapon() {
    if (!gameState.selectedWeapon) return;
    
    // If weapon is already equipped, unequip it
    if (gameState.selectedWeapon.equipped) {
        const weaponName = gameState.selectedWeapon.name;
        gameState.selectedWeapon.equipped = false;
        gameState.equippedWeaponId = null;
        
        saveGameState(); // This now also updates equippedWeapon
        updateEquippedWeapon();
        loadInventory();
        closeDetailsModal();
        
        showNotification(`${weaponName} unequipped!`, 'success');
        return;
    }
    
    // Unequip current weapon if any
    if (gameState.equippedWeaponId) {
        const currentEquipped = gameState.inventory.find(w => w.id == gameState.equippedWeaponId);
        if (currentEquipped) {
            currentEquipped.equipped = false;
        }
    }
    
    // Equip selected weapon
    gameState.selectedWeapon.equipped = true;
    gameState.equippedWeaponId = gameState.selectedWeapon.id;
    
    saveGameState(); // This now also updates equippedWeapon
    updateEquippedWeapon();
    loadInventory();
    closeDetailsModal();
    
    showNotification(`${gameState.selectedWeapon.name} equipped!`, 'success');
}

// Update equipped weapon display
function updateEquippedWeapon() {
    const display = document.getElementById('equippedWeapon');
    const equippedWeapon = getEquippedWeapon();
    
    if (equippedWeapon) {
        display.innerHTML = `
            <div class="weapon-info">
                <div class="weapon-icon" style="font-size: 2rem;">${equippedWeapon.icon}</div>
                <div class="weapon-name rarity-${equippedWeapon.rarity}">${equippedWeapon.name}</div>
                <div class="weapon-stats">ATK +${equippedWeapon.attack} DEF +${equippedWeapon.defense}</div>
                ${equippedWeapon.special ? `<div class="weapon-special">Special: ${equippedWeapon.special}</div>` : ''}
            </div>
        `;
    } else {
        display.innerHTML = '<span class="empty-slot">No weapon equipped</span>';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#00ff00' : '#00d4ff'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Setup event listeners
function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/login.html';
    });
    
    // Add currency on level up (for testing)
    window.addEventListener('storage', (e) => {
        if (e.key === 'playerLevel') {
            // Give bonus currency on level up
            gameState.col += 1000;
            gameState.crystals += 5;
            updateCurrencyDisplay();
            saveGameState();
        }
    });
}

// CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
    @keyframes slideOut {
        from { transform: translateX(0); }
        to { transform: translateX(100%); }
    }
    .equipped-badge {
        position: absolute;
        top: 5px;
        right: 5px;
        background: var(--primary-color);
        color: var(--dark-bg);
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: bold;
    }
`;
document.head.appendChild(style);