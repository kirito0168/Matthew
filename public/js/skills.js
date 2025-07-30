// Skills JavaScript
const API_URL = 'http://localhost:3000/api';

// Game State
let gameState = {
    skillPoints: 100,
    skillCrystals: 20,
    inventory: [],
    equippedSkills: [null, null, null, null],
    selectedSkill: null,
    selectedSlot: null,
    filterType: 'all'
};

// Skill Database
const skillDatabase = {
    common: [
        { name: 'Horizontal', type: 'Slash', damage_multiplier: 1.2, cooldown: 3, crit_chance: 0.1, icon: '➖' },
        { name: 'Vertical', type: 'Slash', damage_multiplier: 1.3, cooldown: 3, crit_chance: 0.1, icon: '|' },
        { name: 'Slant', type: 'Slash', damage_multiplier: 1.25, cooldown: 3, crit_chance: 0.15, icon: '/' },
        { name: 'Rage Spike', type: 'Thrust', damage_multiplier: 1.4, cooldown: 4, crit_chance: 0.2, icon: '🔺' },
        { name: 'Sonic Leap', type: 'Charge', damage_multiplier: 1.35, cooldown: 4, crit_chance: 0.1, icon: '⚡' }
    ],
    uncommon: [
        { name: 'Vorpal Strike', type: 'Thrust', damage_multiplier: 1.8, cooldown: 5, crit_chance: 0.25, icon: '🗡️' },
        { name: 'Savage Fulcrum', type: 'Combo', damage_multiplier: 2.0, cooldown: 6, crit_chance: 0.2, icon: '✖️' },
        { name: 'Howling Octave', type: 'Area', damage_multiplier: 1.6, cooldown: 5, crit_chance: 0.15, icon: '🌀' },
        { name: 'Lightning Fall', type: 'Aerial', damage_multiplier: 1.9, cooldown: 6, crit_chance: 0.3, icon: '⚡' },
        { name: 'Embracer', type: 'Grapple', damage_multiplier: 1.7, cooldown: 5, crit_chance: 0.2, icon: '🤲' }
    ],
    rare: [
        { name: 'Nova Ascension', type: 'Combo', damage_multiplier: 2.5, cooldown: 7, crit_chance: 0.3, icon: '🌟' },
        { name: 'Deadly Sins', type: 'Multi-Hit', damage_multiplier: 2.8, cooldown: 8, crit_chance: 0.25, icon: '💀' },
        { name: 'Phantom Rave', type: 'Speed', damage_multiplier: 2.3, cooldown: 6, crit_chance: 0.35, icon: '👻' },
        { name: 'Mother\'s Rosario', type: 'Combo', damage_multiplier: 3.0, cooldown: 9, crit_chance: 0.3, icon: '🌹' },
        { name: 'Sharp Nail', type: 'Pierce', damage_multiplier: 2.6, cooldown: 7, crit_chance: 0.4, icon: '💢' }
    ],
    epic: [
        { name: 'The Eclipse', type: 'Ultimate', damage_multiplier: 3.5, cooldown: 10, crit_chance: 0.4, icon: '🌑' },
        { name: 'Starburst Stream', type: 'Combo', damage_multiplier: 4.0, cooldown: 12, crit_chance: 0.35, icon: '✨' },
        { name: 'Meteor Break', type: 'Area', damage_multiplier: 3.8, cooldown: 11, crit_chance: 0.45, icon: '☄️' },
        { name: 'Absolute Sword', type: 'Divine', damage_multiplier: 3.6, cooldown: 10, crit_chance: 0.5, icon: '⚔️' },
        { name: 'Nebula Empress', type: 'Magic', damage_multiplier: 3.7, cooldown: 11, crit_chance: 0.4, icon: '🌌' }
    ],
    legendary: [
        { name: 'Dual Blades: Eclipse', type: 'Dual Wield', damage_multiplier: 5.0, cooldown: 15, crit_chance: 0.5, icon: '⚔️⚔️' },
        { name: 'Alicization: Release Recollection', type: 'Memory', damage_multiplier: 6.0, cooldown: 20, crit_chance: 0.6, icon: '🧠' },
        { name: 'Incarnate: Starburst Stream', type: 'Incarnation', damage_multiplier: 5.5, cooldown: 18, crit_chance: 0.55, icon: '💫' },
        { name: 'Godspeed', type: 'Time', damage_multiplier: 4.5, cooldown: 12, crit_chance: 0.7, icon: '⏱️' },
        { name: 'World End', type: 'Apocalypse', damage_multiplier: 7.0, cooldown: 25, crit_chance: 0.5, icon: '🌍' }
    ]
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadGameState();
    updatePointsDisplay();
    loadInventory();
    updateEquippedSkills();
    setupEventListeners();
});

// Load game state from localStorage
function loadGameState() {
    const savedPoints = localStorage.getItem('skillPoints');
    const savedCrystals = localStorage.getItem('skillCrystals');
    const savedInventory = localStorage.getItem('skillInventory');
    const savedEquipped = localStorage.getItem('equippedSkills');
    
    if (savedPoints) gameState.skillPoints = parseInt(savedPoints);
    if (savedCrystals) gameState.skillCrystals = parseInt(savedCrystals);
    if (savedInventory) gameState.inventory = JSON.parse(savedInventory);
    if (savedEquipped) gameState.equippedSkills = JSON.parse(savedEquipped);
}

// Save game state
function saveGameState() {
    localStorage.setItem('skillPoints', gameState.skillPoints);
    localStorage.setItem('skillCrystals', gameState.skillCrystals);
    localStorage.setItem('skillInventory', JSON.stringify(gameState.inventory));
    localStorage.setItem('equippedSkills', JSON.stringify(gameState.equippedSkills));
}

// Update points display
function updatePointsDisplay() {
    document.getElementById('skillPoints').textContent = gameState.skillPoints;
    document.getElementById('skillCrystals').textContent = gameState.skillCrystals;
}

// Pull skill gacha
async function pullSkill(type, count = 1) {
    const costs = {
        basic: { points: 10, crystals: 0 },
        advanced: { points: 0, crystals: 5 }
    };
    
    const totalCost = {
        points: costs[type].points * count * (count === 10 ? 0.9 : 1),
        crystals: costs[type].crystals * count * (count === 10 ? 0.9 : 1)
    };
    
    // Check if player has enough currency
    if (gameState.skillPoints < totalCost.points || gameState.skillCrystals < totalCost.crystals) {
        showNotification('Insufficient resources!', 'error');
        return;
    }
    
    // Deduct currency
    gameState.skillPoints -= Math.floor(totalCost.points);
    gameState.skillCrystals -= Math.floor(totalCost.crystals);
    updatePointsDisplay();
    
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

// Perform single skill pull
function performSinglePull(type) {
    const rates = {
        basic: {
            common: 65,
            uncommon: 25,
            rare: 8,
            epic: 2,
            legendary: 0
        },
        advanced: {
            common: 0,
            uncommon: 40,
            rare: 40,
            epic: 15,
            legendary: 5
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
    
    // Get random skill from rarity pool
    const pool = skillDatabase[rarity];
    const skill = pool[Math.floor(Math.random() * pool.length)];
    
    return {
        ...skill,
        rarity,
        id: Date.now() + Math.random(),
        level: 1,
        equipped: false
    };
}

// Show pull animation
function showPullAnimation() {
    const modal = document.getElementById('pullResultModal');
    const animation = document.getElementById('skillAnimation');
    const results = document.getElementById('pullResults');
    
    modal.classList.remove('hidden');
    animation.classList.remove('hidden');
    results.classList.add('hidden');
}

// Show pull results
function showPullResults(skills) {
    const animation = document.getElementById('skillAnimation');
    const results = document.getElementById('pullResults');
    const skillResults = document.getElementById('skillResults');
    
    animation.classList.add('hidden');
    results.classList.remove('hidden');
    
    skillResults.innerHTML = skills.map(skill => `
        <div class="result-skill rarity-${skill.rarity}">
            <div class="skill-icon">${skill.icon}</div>
            <div class="skill-name">${skill.name}</div>
            <div class="skill-type">${skill.type}</div>
            <div class="skill-damage">${skill.damage_multiplier}x DMG</div>
        </div>
    `).join('');
}

// Close pull modal
function closePullModal() {
    document.getElementById('pullResultModal').classList.add('hidden');
}

// Load inventory
function loadInventory() {
    const grid = document.getElementById('skillsGrid');
    const filteredInventory = gameState.filterType === 'all' 
        ? gameState.inventory 
        : gameState.inventory.filter(s => s.rarity === gameState.filterType);
    
    if (filteredInventory.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No skills found</p>';
        return;
    }
    
    grid.innerHTML = filteredInventory.map(skill => `
        <div class="skill-card rarity-${skill.rarity} ${gameState.selectedSkill && gameState.selectedSkill.id === skill.id ? 'selected' : ''}" onclick="selectSkill('${skill.id}')">
            <div class="skill-icon">${skill.icon}</div>
            <div class="skill-name">${skill.name}</div>
            <div class="skill-type">${skill.type}</div>
            <div class="skill-damage">${skill.damage_multiplier}x DMG</div>
            ${skill.equipped ? '<div class="equipped-badge">EQUIPPED</div>' : ''}
        </div>
    `).join('');
}

// Select skill
function selectSkill(skillId) {
    const skill = gameState.inventory.find(s => s.id == skillId);
    if (!skill) return;
    
    gameState.selectedSkill = skill;
    
    // Update UI
    loadInventory();
    
    // Enable/disable equip button
    const equipBtn = document.getElementById('skillEquipBtn');
    equipBtn.disabled = false;
    equipBtn.textContent = skill.equipped ? 'Change Skill Slot' : 'Equip Selected Skill';
}

// Open equip modal
function openEquipModal() {
    if (!gameState.selectedSkill) return;
    
    const modal = document.getElementById('slotSelectionModal');
    document.getElementById('selectedSkillName').textContent = gameState.selectedSkill.name;
    
    // Update slot previews
    gameState.equippedSkills.forEach((skill, index) => {
        const preview = document.getElementById(`slotPreview${index + 1}`);
        preview.textContent = skill ? skill.name : 'Empty';
        preview.style.color = skill ? getRarityColor(skill.rarity) : 'var(--text-secondary)';
    });
    
    modal.classList.remove('hidden');
}

// Close slot modal
function closeSlotModal() {
    document.getElementById('slotSelectionModal').classList.add('hidden');
}

// Equip to specific slot
function equipToSlot(slotIndex) {
    if (!gameState.selectedSkill) return;
    
    // Remove skill from other slots
    gameState.equippedSkills = gameState.equippedSkills.map(s => 
        s && s.id === gameState.selectedSkill.id ? null : s
    );
    
    // Equip to selected slot
    gameState.equippedSkills[slotIndex] = gameState.selectedSkill;
    
    // Update skill equipped status
    gameState.inventory.forEach(skill => {
        skill.equipped = gameState.equippedSkills.some(s => s && s.id === skill.id);
    });
    
    saveGameState();
    updateEquippedSkills();
    loadInventory();
    closeSlotModal();
    
    showNotification(`${gameState.selectedSkill.name} equipped to Slot ${slotIndex + 1}!`, 'success');
}

// Unequip all skills
function unequipAllSkills() {
    if (gameState.equippedSkills.every(s => s === null)) {
        showNotification('No skills equipped!', 'error');
        return;
    }
    
    gameState.equippedSkills = [null, null, null, null];
    
    // Update skill equipped status
    gameState.inventory.forEach(skill => {
        skill.equipped = false;
    });
    
    saveGameState();
    updateEquippedSkills();
    loadInventory();
    
    showNotification('All skills unequipped!', 'success');
}

// Filter skills
function filterSkills(type) {
    gameState.filterType = type;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadInventory();
}

// Show skill details
function showSkillDetails(skillId) {
    const skill = gameState.inventory.find(s => s.id == skillId);
    if (!skill) return;
    
    gameState.selectedSkill = skill;
    
    const modal = document.getElementById('skillDetailsModal');
    document.getElementById('modalSkillName').textContent = skill.name;
    document.getElementById('modalSkillRarity').textContent = skill.rarity.toUpperCase();
    document.getElementById('modalSkillRarity').className = `skill-rarity rarity-${skill.rarity}`;
    document.getElementById('modalSkillDamage').textContent = `${skill.damage_multiplier}x`;
    document.getElementById('modalSkillCooldown').textContent = `${skill.cooldown}s`;
    document.getElementById('modalSkillCrit').textContent = `${Math.round(skill.crit_chance * 100)}%`;
    document.getElementById('modalSkillType').textContent = skill.type;
    
    const descriptions = {
        'Horizontal': 'A basic horizontal slash that cuts through enemies.',
        'Vertical': 'A powerful downward strike.',
        'Slant': 'A diagonal cut that catches enemies off-guard.',
        'Rage Spike': 'A furious thrust that pierces armor.',
        'Sonic Leap': 'Charge forward with incredible speed.',
        'Vorpal Strike': 'A lightning-fast thrust that rarely misses.',
        'Starburst Stream': 'The legendary 16-hit combo of the Dual Blades.',
        'The Eclipse': 'Unleash the power of darkness itself.',
        'Dual Blades: Eclipse': 'Master the art of dual wielding.',
        'World End': 'A skill that threatens to end everything.'
    };
    
    document.getElementById('modalSkillDesc').textContent = descriptions[skill.name] || 'A powerful sword skill from Aincrad.';
    
    // Hide equip button for now
    document.getElementById('equipSkillBtn').classList.add('hidden');
    
    modal.classList.remove('hidden');
}

// Close details modal
function closeDetailsModal() {
    document.getElementById('skillDetailsModal').classList.add('hidden');
}

// Open slot selection
function openSlotSelection(slotIndex) {
    gameState.selectedSlot = slotIndex;
    
    // Show skill selection modal with equip button
    const modal = document.getElementById('skillDetailsModal');
    const equipBtn = document.getElementById('equipSkillBtn');
    
    // Show all skills for selection
    if (gameState.inventory.length === 0) {
        showNotification('No skills available to equip!', 'error');
        return;
    }
    
    // Show first skill details
    showSkillDetails(gameState.inventory[0].id);
    equipBtn.classList.remove('hidden');
    equipBtn.textContent = `Equip to Slot ${slotIndex + 1}`;
}

// Equip skill to slot
function equipSkillToSlot() {
    if (!gameState.selectedSkill || gameState.selectedSlot === null) return;
    
    // Remove skill from other slots
    gameState.equippedSkills = gameState.equippedSkills.map(s => 
        s && s.id === gameState.selectedSkill.id ? null : s
    );
    
    // Equip to selected slot
    gameState.equippedSkills[gameState.selectedSlot] = gameState.selectedSkill;
    
    // Update skill equipped status
    gameState.inventory.forEach(skill => {
        skill.equipped = gameState.equippedSkills.some(s => s && s.id === skill.id);
    });
    
    saveGameState();
    updateEquippedSkills();
    loadInventory();
    closeDetailsModal();
    
    showNotification(`${gameState.selectedSkill.name} equipped to Slot ${gameState.selectedSlot + 1}!`, 'success');
}

// Update equipped skills display
function updateEquippedSkills() {
    gameState.equippedSkills.forEach((skill, index) => {
        const slot = document.getElementById(`slot${index + 1}`);
        
        if (skill) {
            slot.innerHTML = `
                <span class="slot-number">${index + 1}</span>
                <div class="skill-icon" style="font-size: 2rem;">${skill.icon}</div>
                <div class="skill-name rarity-${skill.rarity}">${skill.name}</div>
                <div class="skill-type">${skill.type}</div>
                <div class="skill-damage">${skill.damage_multiplier}x</div>
            `;
            slot.classList.add('filled');
        } else {
            slot.innerHTML = `
                <span class="slot-number">${index + 1}</span>
                <span class="empty-slot">Empty Slot</span>
            `;
            slot.classList.remove('filled');
        }
    });
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
        color: ${type === 'success' ? '#000' : '#fff'};
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        font-weight: bold;
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
    
    // Add skill points on level up
    window.addEventListener('storage', (e) => {
        if (e.key === 'playerLevel') {
            // Give bonus skill points on level up
            gameState.skillPoints += 10;
            gameState.skillCrystals += 2;
            updatePointsDisplay();
            saveGameState();
        }
    });
}

// CSS for notifications and badges
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