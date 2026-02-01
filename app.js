/**
 * LUXURY POS - Main Application Logic
 */

const CONFIG = {
    DATA_PATH: './public/data/'
};

let state = {
    currentTab: 'reception',
    stores: [],
    selectedStoreId: null,
    masters: null,
    tickets: []
};

document.addEventListener('DOMContentLoaded', async () => {
    initApp();
});

async function initApp() {
    setupEventListeners();
    await fetchStoreList();
    renderStoreSelector();
    switchTab('reception');
}

function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });

    const storeSelect = document.getElementById('storeSelect');
    if (storeSelect) {
        storeSelect.addEventListener('change', (e) => {
            state.selectedStoreId = e.target.value;
            loadStoreData();
        });
    }
}

async function fetchStoreList() {
    try {
        const response = await fetch(`${CONFIG.DATA_PATH}stores.json`);
        state.stores = await response.json();
    } catch (e) {
        state.stores = [{ id: '1U0BOkVRDLyr27GiHsOgDcl_CmUMMP7JcOoAZXLx3G5Y', name: 'マスター店舗' }];
    }
}

function renderStoreSelector() {
    const selector = document.getElementById('storeSelect');
    if (!selector) return;
    selector.innerHTML = state.stores.map(s =>
        `<option value="${s.id}">${s.name}</option>`
    ).join('');
    state.selectedStoreId = state.stores[0].id;
}

function switchTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    render();
}

async function loadStoreData() {
    try {
        const response = await fetch(`${CONFIG.DATA_PATH}masters.json`);
        state.masters = await response.json();
        console.log('Léâme Masters Loaded:', state.masters);
        render();
    } catch (e) {
        console.error('Failed to load master data', e);
    }
}

function render() {
    const app = document.getElementById('app');
    if (!app) return;

    if (!state.masters) {
        app.innerHTML = '<div class="loader-container"><div class="loader"></div><p>マスターデータを準備中...</p></div>';
        return;
    }

    const { currentTab } = state;
    let html = `<div class="content-header"><h2>${currentTab === 'reception' ? '受付' : currentTab === 'service' ? '接客中' : '精算'}</h2></div>`;

    if (currentTab === 'reception') {
        html += renderReception();
    } else {
        html += `<div class="card"><p>${currentTab.toUpperCase()} モジュール準備中...</p></div>`;
    }

    app.innerHTML = html;
}

function renderReception() {
    const tables = state.masters.tables.map(t => `<option value="${t.ID || t.id}">${t.名称 || t.name}</option>`).join('');
    const staffs = state.masters.staff.map(s => `<option value="${s.ID || s.id}">${s.名称 || s.name}</option>`).join('');

    return `
        <div class="glass-card fade-in">
            <div class="form-group"><label>テーブル</label><select id="tableInput" multiple>${tables}</select></div>
            <div class="form-group"><label>メインスタッフ</label><select id="staffInput">${staffs}</select></div>
            <div class="form-group"><label>人数</label><input type="number" id="peopleInput" value="1" min="1"></div>
            <button class="primary-btn" onclick="handleReception()">受付を開始する</button>
        </div>
    `;
}
