// Authentication JavaScript

// Make sure API_URL is defined
const API_URL = window.API_URL || '/api';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Handle login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = loginForm.querySelector('.btn-submit');
            submitBtn.classList.add('loading');
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                console.log('Login response:', data);

                if (response.ok) {
                    // Store token and user data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Show success message
                    showMessage('Login successful! Redirecting...', 'success');
                    
                    // Add login effect
                    const loginEffect = document.createElement('div');
                    loginEffect.className = 'login-effect';
                    document.body.appendChild(loginEffect);
                    
                    // Redirect after animation
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    showMessage(data.message || 'Login failed', 'error');
                    submitBtn.classList.remove('loading');
                }
            } catch (error) {
                console.error('Login error:', error);
                showMessage('Network error. Please check if the server is running.', 'error');
                submitBtn.classList.remove('loading');
            }
        });
    }

    // Handle registration
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = registerForm.querySelector('.btn-submit');
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validate passwords match
            if (password !== confirmPassword) {
                showMessage('Passwords do not match', 'error');
                return;
            }

            // Validate username format
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                showMessage('Username can only contain letters, numbers, and underscores', 'error');
                return;
            }

            submitBtn.classList.add('loading');

            try {
                console.log('Attempting registration with:', { username, email });
                
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();
                console.log('Registration response:', data);

                if (response.ok) {
                    // Store token and user data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Show success message
                    showMessage('Account created successfully! Welcome to SAO!', 'success');
                    
                    // Show level up animation
                    const levelUp = document.createElement('div');
                    levelUp.className = 'level-up';
                    levelUp.textContent = 'LEVEL 1 ACHIEVED!';
                    document.body.appendChild(levelUp);
                    
                    // Redirect after animation
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 2000);
                } else {
                    showMessage(data.message || 'Registration failed', 'error');
                    submitBtn.classList.remove('loading');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showMessage('Network error. Please check if the server is running.', 'error');
                submitBtn.classList.remove('loading');
            }
        });
    }

    // Show message function
    function showMessage(text, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;

        const form = document.querySelector('.auth-form');
        form.insertBefore(message, form.firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => {
            message.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => message.remove(), 300);
        }, 5000);
    }

    // Add input animations
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.parentElement.classList.remove('focused');
            }
        });
    });
});