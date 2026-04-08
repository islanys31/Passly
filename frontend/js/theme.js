/**
 * Passly - Gestión de Temas
 */
export function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeUI(newTheme);
}

function updateThemeUI(theme) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    
    // Switch between moon and sun icons
    icon.setAttribute('data-lucide', theme === 'light' ? 'sun' : 'moon');
    
    // Update text if exists
    const text = document.getElementById('themeText');
    if (text) text.textContent = theme === 'light' ? 'Light Mode' : 'Dark Mode';

    // Reload Lucide
    if (window.lucide) window.lucide.createIcons();
}
