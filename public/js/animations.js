// SAO Theme Animations JavaScript

// Particle System
function createParticleSystem() {
    const particleSystem = document.querySelector('.particle-system');
    if (!particleSystem) return;

    function createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * window.innerWidth + 'px';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particleSystem.appendChild(particle);

        // Remove particle after animation
        setTimeout(() => {
            particle.remove();
        }, 20000);
    }

    // Create initial particles
    for (let i = 0; i < 20; i++) {
        setTimeout(() => createParticle(), i * 500);
    }

    // Continue creating particles
    setInterval(createParticle, 1000);
}

// Floating particles background
function createFloatingParticles() {
    const container = document.querySelector('.floating-particles');
    if (!container) return;

    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 3 + 1}px;
            height: ${Math.random() * 3 + 1}px;
            background: var(--primary-color);
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.5 + 0.5};
            animation: floatRandom ${Math.random() * 20 + 10}s linear infinite;
        `;
        container.appendChild(particle);
    }
}

// Add floating animation
const style = document.createElement('style');
style.textContent = `
    @keyframes floatRandom {
        from {
            transform: translate(0, 0);
        }
        25% {
            transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
        }
        50% {
            transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
        }
        75% {
            transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
        }
        to {
            transform: translate(0, 0);
        }
    }
`;
document.head.appendChild(style);

// Typing effect
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.textContent = '';
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Apply typing effect to elements with class
document.addEventListener('DOMContentLoaded', () => {
    const typingElements = document.querySelectorAll('.typing-text');
    typingElements.forEach(element => {
        const text = element.textContent;
        typeWriter(element, text);
    });
});

// Damage number effect
function showDamageNumber(x, y, damage, isCritical = false) {
    const damageNumber = document.createElement('div');
    damageNumber.className = `damage-number ${isCritical ? 'critical' : ''}`;
    damageNumber.textContent = damage;
    damageNumber.style.left = x + 'px';
    damageNumber.style.top = y + 'px';
    document.body.appendChild(damageNumber);
    
    setTimeout(() => damageNumber.remove(), 1000);
}

// Skill activation effect
function showSkillActivation() {
    const skill = document.createElement('div');
    skill.className = 'skill-activation';
    document.body.appendChild(skill);
    
    setTimeout(() => skill.remove(), 1000);
}

// Quest complete notification
function showQuestComplete(questName, expReward) {
    const notification = document.createElement('div');
    notification.className = 'quest-complete';
    notification.innerHTML = `
        <h2>Quest Complete!</h2>
        <p>${questName}</p>
        <p>+${expReward} EXP</p>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}

// Achievement unlock notification
function showAchievementUnlock(achievementName, description) {
    const notification = document.createElement('div');
    notification.className = 'achievement-unlock';
    notification.innerHTML = `
        <div class="achievement-icon">🏆</div>
        <div class="achievement-content">
            <h3>Achievement Unlocked!</h3>
            <p class="achievement-name">${achievementName}</p>
            <p class="achievement-desc">${description}</p>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 4000);
}

// Level up effect
function showLevelUp(newLevel) {
    const levelUp = document.createElement('div');
    levelUp.className = 'level-up';
    levelUp.textContent = `LEVEL ${newLevel}!`;
    document.body.appendChild(levelUp);
    
    // Play sound effect if available
    playSound('levelup');
    
    setTimeout(() => levelUp.remove(), 2000);
}

// Menu transition effect
function menuTransition(callback) {
    const transition = document.createElement('div');
    transition.className = 'menu-transition';
    transition.innerHTML = '<div class="menu-hexagon"></div>';
    document.body.appendChild(transition);
    
    setTimeout(() => {
        transition.classList.add('active');
    }, 10);
    
    setTimeout(() => {
        if (callback) callback();
        transition.classList.remove('active');
        setTimeout(() => transition.remove(), 300);
    }, 500);
}

// Sound effects (placeholder - would need actual audio files)
function playSound(soundName) {
    // In a real implementation, you would play audio files here
    console.log(`Playing sound: ${soundName}`);
}

// Initialize animations
document.addEventListener('DOMContentLoaded', () => {
    createParticleSystem();
    createFloatingParticles();
    
    // Add hover effects to buttons
    const buttons = document.querySelectorAll('button, .btn-primary, .btn-secondary');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            playSound('hover');
        });
        
        button.addEventListener('click', () => {
            playSound('click');
        });
    });
    
    // Add page transition effects
    const links = document.querySelectorAll('a[href$=".html"]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            if (!link.href.includes('#')) {
                e.preventDefault();
                const href = link.href;
                menuTransition(() => {
                    window.location.href = href;
                });
            }
        });
    });
});

// Export functions for use in other scripts
window.showDamageNumber = showDamageNumber;
window.showSkillActivation = showSkillActivation;
window.showQuestComplete = showQuestComplete;
window.showAchievementUnlock = showAchievementUnlock;
window.showLevelUp = showLevelUp;
window.menuTransition = menuTransition;