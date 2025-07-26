// Contact JavaScript

document.addEventListener('DOMContentLoaded', async () => {
    // Update navigation (user might be logged in)
    await updateNavigation();

    // Check if user is logged in and pre-fill form
    const user = await checkAuth();
    if (user) {
        document.getElementById('contactName').value = user.username;
        document.getElementById('contactEmail').value = user.email;
    }

    // Setup form handler
    document.getElementById('contactForm').addEventListener('submit', handleContactSubmit);
});

async function handleContactSubmit(e) {
    e.preventDefault();

    const submitBtn = document.querySelector('.btn-submit');
    submitBtn.classList.add('loading');

    const formData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value
    };

    try {
        const response = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Message sent successfully! We\'ll get back to you soon.', 'success');
            document.getElementById('contactForm').reset();
            
            // Re-fill user data if logged in
            const user = await checkAuth();
            if (user) {
                document.getElementById('contactName').value = user.username;
                document.getElementById('contactEmail').value = user.email;
            }
        } else {
            showMessage(data.message || 'Failed to send message', 'error');
        }
    } catch (error) {
        console.error('Contact form error:', error);
        showMessage('Network error. Please try again.', 'error');
    } finally {
        submitBtn.classList.remove('loading');
    }
}

function showMessage(text, type) {
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;

    const form = document.querySelector('.contact-form');
    form.insertBefore(message, form.firstChild);

    // Auto remove after 5 seconds
    setTimeout(() => {
        message.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => message.remove(), 300);
    }, 5000);
}

// Add contact-specific styles
const style = document.createElement('style');
style.textContent = `
.contact-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
}

.contact-header {
    text-align: center;
    margin-bottom: 3rem;
    animation: fadeInUp 0.5s ease-out;
}

.contact-content {
    animation: fadeInUp 0.5s ease-out 0.2s backwards;
}

.contact-card {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 3rem;
    backdrop-filter: blur(10px);
}

.contact-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.contact-info {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.contact-info h2 {
    color: var(--primary-color);
    margin-bottom: 1rem;
}

.info-item {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
}

.info-icon {
    font-size: 2rem;
    flex-shrink: 0;
}

.info-item h3 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.info-item p {
    color: var(--text-secondary);
}

@media (max-width: 768px) {
    .contact-card {
        grid-template-columns: 1fr;
        padding: 2rem 1.5rem;
    }
}
`;
document.head.appendChild(style);