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

// Update points display
function updatePointsDisplay() {
    const pointsElement = document.getElementById('currentSkillPoints');
    const crystalsElement = document.getElementById('currentSkillCrystals');
    
    if (pointsElement) pointsElement.textContent = gameState.skillPoints.toLocaleString();
    if (crystalsElement) crystalsElement.textContent = gameState.skillCrystals.toLocaleString();
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

// Show notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#00ff00' : '#00d4ff'};
        color: ${type === 'success' ? '#000000' : '#ffffff'};
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-weight: bold;
    `;
    
    document.body.appendChild(notification);
    
    // Add animation styles if not already present
    if (!document.getElementById('notificationStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Pull skills - Main function
function pullSkill(type, count = 1) {
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
    
    if (modal) modal.classList.remove('hidden');
    if (animation) animation.classList.remove('hidden');
    if (results) results.classList.add('hidden');
}

// Show pull results
function showPullResults(skills) {
    const animation = document.getElementById('skillAnimation');
    const results = document.getElementById('pullResults');
    const skillResults = document.getElementById('skillResults');
    
    if (animation) animation.classList.add('hidden');
    if (results) results.classList.remove('hidden');
    
    if (skillResults) {
        skillResults.innerHTML = skills.map(skill => `
            <div class="result-skill rarity-${skill.rarity}">
                <div class="skill-icon">${skill.icon}</div>
                <div class="skill-name">${skill.name}</div>
                <div class="skill-type">${skill.type}</div>
                <div class="skill-damage">${skill.damage_multiplier}x DMG</div>
            </div>
        `).join('');
    }
}

// Close pull modal
function closePullModal() {
    const modal = document.getElementById('pullResultModal');
    if (modal) modal.classList.add('hidden');
}

// Load inventory
function loadInventory() {
    const grid = document.getElementById('skillsGrid');
    if (!grid) return;
    
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
    if (equipBtn) {
        equipBtn.disabled = false;
        equipBtn.textContent = skill.equipped ? 'Change Skill Slot' : 'Equip Selected Skill';
    }
}

// Open equip modal
function openEquipModal() {
    if (!gameState.selectedSkill) return;
    
    const modal = document.getElementById('slotSelectionModal');
    const skillNameElement = document.getElementById('selectedSkillName');
    
    if (skillNameElement) skillNameElement.textContent = gameState.selectedSkill.name;
    
    // Update slot previews
    gameState.equippedSkills.forEach((skill, index) => {
        const preview = document.getElementById(`slotPreview${index + 1}`);
        if (preview) {
            preview.textContent = skill ? skill.name : 'Empty';
            preview.style.color = skill ? getRarityColor(skill.rarity) : 'var(--text-secondary)';
        }
    });
    
    if (modal) modal.classList.remove('hidden');
}

// Close slot modal
function closeSlotModal() {
    const modal = document.getElementById('slotSelectionModal');
    if (modal) modal.classList.add('hidden');
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
    
    // Find the clicked button and add active class
    const clickedBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
        btn.textContent.toLowerCase().includes(type) || 
        (type === 'all' && btn.textContent === 'All')
    );
    if (clickedBtn) clickedBtn.classList.add('active');
    
    loadInventory();
}

// Show skill details
function showSkillDetails(skillId) {
    const skill = gameState.inventory.find(s => s.id == skillId);
    if (!skill) return;
    
    gameState.selectedSkill = skill;
    
    const modal = document.getElementById('skillDetailsModal');
    const elements = {
        name: document.getElementById('modalSkillName'),
        rarity: document.getElementById('modalSkillRarity'),
        damage: document.getElementById('modalSkillDamage'),
        cooldown: document.getElementById('modalSkillCooldown'),
        crit: document.getElementById('modalSkillCrit'),
        type: document.getElementById('modalSkillType'),
        desc: document.getElementById('modalSkillDesc') || document.getElementById('modalSkillDescription')
    };
    
    if (elements.name) elements.name.textContent = skill.name;
    if (elements.rarity) {
        elements.rarity.textContent = skill.rarity.toUpperCase();
        elements.rarity.className = `skill-rarity rarity-${skill.rarity}`;
    }
    if (elements.damage) elements.damage.textContent = `${skill.damage_multiplier}x`;
    if (elements.cooldown) elements.cooldown.textContent = `${skill.cooldown}s`;
    if (elements.crit) elements.crit.textContent = `${Math.round(skill.crit_chance * 100)}%`;
    if (elements.type) elements.type.textContent = skill.type;
    
    const descriptions = {
        'Horizontal': 'A basic horizontal slash that cuts through enemies.',
        'Vertical': 'A powerful downward strike.',
        'Slant': 'A diagonal cut that catches enemies off-guard.',
        'Rage Spike': 'A piercing thrust that deals massive damage.',
        'Sonic Leap': 'Dash forward at incredible speed.',
        'Vorpal Strike': 'A precise strike that always finds its mark.',
        'Starburst Stream': '16-hit combo with dual blades.',
        'The Eclipse': 'Darkness consumes all enemies.',
        'Dual Blades: Eclipse': 'The ultimate dual-wielding technique.',
        'World End': 'A skill that can end the world itself.'
    };
    
    if (elements.desc) {
        elements.desc.textContent = descriptions[skill.name] || 'A powerful skill from the world of SAO.';
    }
    
    const equipBtn = document.getElementById('modalEquipBtn');
    if (equipBtn) {
        equipBtn.textContent = skill.equipped ? 'Change Skill Slot' : 'Equip Skill';
        equipBtn.onclick = () => {
            closeDetailsModal();
            openEquipModal();
        };
    }
    
    if (modal) modal.classList.remove('hidden');
}

// Close details modal
function closeDetailsModal() {
    const modal = document.getElementById('skillDetailsModal');
    if (modal) modal.classList.add('hidden');
}

// Open slot selection
function openSlotSelection(slotIndex) {
    gameState.selectedSlot = slotIndex;
    
    const equipBtn = document.getElementById('equipSkillBtn');
    
    if (gameState.inventory.length === 0) {
        showNotification('No skills available to equip!', 'error');
        return;
    }
    
    // Show first skill details
    showSkillDetails(gameState.inventory[0].id);
    if (equipBtn) {
        equipBtn.classList.remove('hidden');
        equipBtn.textContent = `Equip to Slot ${slotIndex + 1}`;
    }
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
        
        if (slot) {
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
        }
    });
}

// Close slot selection modal
function closeSlotSelectionModal() {
    const modal = document.getElementById('slotSelectionModal');
    if (modal) modal.classList.add('hidden');
}

// Make functions globally accessible
window.pullSkill = pullSkill;
window.filterSkills = filterSkills;
window.selectSkill = selectSkill;
window.openEquipModal = openEquipModal;
window.closeSlotModal = closeSlotModal;
window.equipToSlot = equipToSlot;
window.unequipAllSkills = unequipAllSkills;
window.closePullModal = closePullModal;
window.showSkillDetails = showSkillDetails;
window.closeDetailsModal = closeDetailsModal;
window.openSlotSelection = openSlotSelection;
window.equipSkillToSlot = equipSkillToSlot;
window.closeSlotSelectionModal = closeSlotSelectionModal;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Add missing CSS styles
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        /* Modal Base Styles */
        .modal {
            display: flex !important;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            align-items: center;
            justify-content: center;
        }
        
        .modal.hidden {
            display: none !important;
        }
        
        .modal-content {
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(138, 43, 226, 0.2));
            border: 2px solid #8a2be2;
            border-radius: 15px;
            padding: 2rem;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
            animation: modalAppear 0.3s ease-out;
        }
        
        @keyframes modalAppear {
            from {
                opacity: 0;
                transform: scale(0.8);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        .modal-btn {
            background: #8a2be2;
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 1rem;
        }
        
        .modal-btn:hover {
            background: #a855f7;
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(138, 43, 226, 0.5);
        }
        
        .result-title {
            font-size: 2rem;
            color: #8a2be2;
            margin-bottom: 2rem;
            text-align: center;
        }
        
        .skill-description {
            color: var(--text-secondary);
            font-style: italic;
            text-align: center;
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        
        #modalSkillDesc {
            color: var(--text-secondary);
            font-style: italic;
            text-align: center;
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        
        .close-btn {
            background: rgba(255, 0, 0, 0.2);
            border: 2px solid #ff6666;
            color: #ff6666;
            padding: 0.8rem 2rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .close-btn:hover {
            background: rgba(255, 0, 0, 0.3);
        }
        
        .equipped-badge {
            position: absolute;
            top: 5px;
            right: 5px;
            background: #8a2be2;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: bold;
        }
    `;
    document.head.appendChild(modalStyles);
    
    updatePointsDisplay();
    loadInventory();
    updateEquippedSkills();
});