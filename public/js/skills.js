// Skills System JavaScript
// Initialize game state
let gameState = {
    skillPoints: parseInt(localStorage.getItem('skillPoints')) || 100,
    skillCrystals: parseInt(localStorage.getItem('skillCrystals')) || 20,
    inventory: JSON.parse(localStorage.getItem('skillInventory')) || [],
    equippedSkills: JSON.parse(localStorage.getItem('equippedSkills')) || [null, null, null, null],
    selectedSkill: null,
    selectedSlot: null,
    filterType: 'all'
};

// Skill Database
const skillDatabase = {
    common: [
        { name: 'Horizontal', type: 'Sword Skill', damage_multiplier: 1.2, cooldown: 3, crit_chance: 0.1, icon: '⚔️' },
        { name: 'Vertical', type: 'Sword Skill', damage_multiplier: 1.4, cooldown: 4, crit_chance: 0.15, icon: '🗡️' }
    ],
    uncommon: [
        { name: 'Slant', type: 'Sword Skill', damage_multiplier: 1.6, cooldown: 5, crit_chance: 0.2, icon: '⚔️' },
        { name: 'Rage Spike', type: 'Spear Skill', damage_multiplier: 1.8, cooldown: 6, crit_chance: 0.25, icon: '🔱' }
    ],
    rare: [
        { name: 'Sonic Leap', type: 'Movement Skill', damage_multiplier: 2.0, cooldown: 8, crit_chance: 0.3, icon: '💨' },
        { name: 'Vorpal Strike', type: 'Rapier Skill', damage_multiplier: 2.2, cooldown: 7, crit_chance: 0.35, icon: '🤺' }
    ],
    epic: [
        { name: 'Starburst Stream', type: 'Dual Blades', damage_multiplier: 3.0, cooldown: 15, crit_chance: 0.4, icon: '✨' },
        { name: 'The Eclipse', type: 'Darkness Blade', damage_multiplier: 2.8, cooldown: 12, crit_chance: 0.45, icon: '🌑' }
    ],
    legendary: [
        { name: 'Dual Blades: Eclipse', type: 'Unique Skill', damage_multiplier: 4.0, cooldown: 20, crit_chance: 0.5, icon: '🌟' },
        { name: 'World End', type: 'Ultimate Skill', damage_multiplier: 5.0, cooldown: 30, crit_chance: 0.6, icon: '💫' }
    ]
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updatePointsDisplay();
    loadInventory();
    updateEquippedSkills();
});

// Update points display
function updatePointsDisplay() {
    document.getElementById('currentSkillPoints').textContent = gameState.skillPoints.toLocaleString();
    document.getElementById('currentSkillCrystals').textContent = gameState.skillCrystals.toLocaleString();
}

// Save game state
function saveGameState() {
    localStorage.setItem('skillPoints', gameState.skillPoints);
    localStorage.setItem('skillCrystals', gameState.skillCrystals);
    localStorage.setItem('skillInventory', JSON.stringify(gameState.inventory));
    localStorage.setItem('equippedSkills', JSON.stringify(gameState.equippedSkills));
}

// Get rarity color
function getRarityColor(rarity) {
    const colors = {
        common: '#b0b0b0',
        uncommon: '#00ff00',
        rare: '#0099ff',
        epic: '#9933ff',
        legendary: '#ff9900'
    };
    return colors[rarity] || '#ffffff';
}

// Pull skills - FIXED FUNCTION NAME TO MATCH HTML
function pullSkill(type, count = 1) {
    const costs = {
        basic: { points: 10, crystals: 0 },  // Fixed to match HTML
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
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-weight: bold;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    
    // Add animation keyframes if not already present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add equipped badge styles
if (!document.querySelector('#equipped-badge-styles')) {
    const style = document.createElement('style');
    style.id = 'equipped-badge-styles';
    style.textContent = `
        .equipped-badge {
            position: absolute;
            top: 5px;
            right: 5px;
            background: #00ff00;
            color: #000;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: bold;
            text-transform: uppercase;
            box-shadow: 0 2px 10px rgba(0, 255, 0, 0.5);
        }
        
        .rarity-common { border-color: #b0b0b0 !important; }
        .rarity-uncommon { border-color: #00ff00 !important; }
        .rarity-rare { border-color: #0099ff !important; }
        .rarity-epic { border-color: #9933ff !important; }
        .rarity-legendary { 
            border-color: #ff9900 !important;
            animation: legendary-glow 2s ease-in-out infinite;
        }
        
        @keyframes legendary-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(255, 153, 0, 0.5); }
            50% { box-shadow: 0 0 40px rgba(255, 153, 0, 0.8); }
        }
    `;
    document.head.appendChild(style);
}