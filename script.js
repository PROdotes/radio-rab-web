// Tab Switching Logic
const navTriggers = document.querySelectorAll('.nav-trigger');
const tabContents = document.querySelectorAll('.tab-content');

navTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
        const targetTab = trigger.getAttribute('data-tab');

        // Update active nav state
        navTriggers.forEach(t => t.classList.remove('active'));
        trigger.classList.add('active');

        // Update active content
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === targetTab) {
                content.classList.add('active');
            }
        });

        // Trigger AI Typing effect if on feed
        if (targetTab === 'feed') {
            triggerAITyping();
        }
    });
});

// Modal Controls
function openReporter() {
    document.getElementById('reporter-modal').style.display = 'flex';
}

function closeReporter() {
    document.getElementById('reporter-modal').style.display = 'none';
}

// AI Typing Simulation
function triggerAITyping() {
    const typingEl = document.querySelector('.typing');
    if (!typingEl) return;

    typingEl.textContent = 'Generiram sažetak...';
    setTimeout(() => {
        typingEl.textContent = 'AI Sažetak';
    }, 1500);
}

// Entry Animations
document.addEventListener('DOMContentLoaded', () => {
    triggerAITyping();

    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('visible');
        }, 150 * index);
    });
});
