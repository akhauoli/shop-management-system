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
    // データ読み込みロジック
    render();
}

function render() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `<h2>${state.currentTab.toUpperCase()}</h2><p>店舗ID: ${state.selectedStoreId} のデータを表示中...</p>`;
}
