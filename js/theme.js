// 主題管理模組

// 獲取系統主題偏好
function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

// 應用主題
function applyTheme(theme) {
    const html = document.documentElement;
    
    if (theme === 'auto') {
        const systemTheme = getSystemTheme();
        html.setAttribute('data-theme', systemTheme);
    } else {
        html.setAttribute('data-theme', theme);
    }
}

// 初始化主題
function initTheme() {
    // 從 localStorage 讀取保存的主題選擇
    const savedTheme = localStorage.getItem('appTheme') || 'auto';
    const themeSelect = document.getElementById('themeSelect');
    
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
    
    // 應用主題
    applyTheme(savedTheme);
    
    // 監聽系統主題變化（僅在 auto 模式下）
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', function(e) {
            if (savedTheme === 'auto') {
                applyTheme('auto');
            }
        });
    }
}

// 設置主題選擇器事件監聽
function setupThemeSelector() {
    const themeSelect = document.getElementById('themeSelect');
    
    if (themeSelect) {
        themeSelect.addEventListener('change', function(e) {
            const selectedTheme = e.target.value;
            
            // 保存到 localStorage
            localStorage.setItem('appTheme', selectedTheme);
            
            // 應用主題
            applyTheme(selectedTheme);
        });
    }
}
