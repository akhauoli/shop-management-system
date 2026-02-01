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
    if (!state.masters || !state.masters.tables || !state.masters.staff) {
        return '<div class="card"><p>マスターデータを読み込み中...</p></div>';
    }

    const findField = (row, candidates) => {
        const found = candidates.find(c => row[c] !== undefined);
        return found ? row[found] : '';
    };

    const tableNames = ['名称', '名前', 'name', 'テーブル名'];
    const tableIds = ['ID', 'id', 'コード'];
    const staffNames = ['名称', '名前', 'name', 'スタッフ名'];
    const staffIds = ['ID', 'id', 'コード'];

    const tables = state.masters.tables.map(t =>
        `<option value="${findField(t, tableIds)}">${findField(t, tableNames)}</option>`
    ).join('');

    const staffs = state.masters.staff.map(s =>
        `<option value="${findField(s, staffIds)}">${findField(s, staffNames)}</option>`
    ).join('');

    return `
        <div class="glass-card fade-in">
            <div class="form-group">
                <label>顧客区分</label>
                <select id="customerType" class="modern-select">
                    <option value="通常">通常</option>
                    <option value="新規">新規</option>
                    <option value="指名">指名</option>
                </select>
            </div>
            <div class="form-group">
                <label>テーブル選択 (複数可)</label>
                <select id="tableInput" multiple class="modern-select" style="height: 120px;">${tables}</select>
            </div>
            <div class="form-group">
                <label>メインスタッフ</label>
                <select id="staffInput" class="modern-select">${staffs}</select>
            </div>
            <div class="form-group">
                <label>サブスタッフ (複数選択)</label>
                <select id="subStaffInput" multiple class="modern-select" style="height: 100px;">${staffs}</select>
            </div>
            <div class="form-group">
                <label>入店人数</label>
                <input type="number" id="peopleInput" value="1" min="1" class="modern-input">
            </div>
            <button class="primary-btn pulse" onclick="handleReception()">受付を確定・送信</button>
        </div>
    `;
}

async function handleReception() {
    const payload = {
        customer_type: document.getElementById('customerType').value,
        people_count: parseInt(document.getElementById('peopleInput').value),
        table_ids: Array.from(document.getElementById('tableInput').selectedOptions).map(o => o.value),
        table_names: Array.from(document.getElementById('tableInput').selectedOptions).map(o => o.text).join(','),
        main_cast_id: document.getElementById('staffInput').value,
        main_cast_name: document.getElementById('staffInput').options[document.getElementById('staffInput').selectedIndex].text,
        sub_cast_ids: Array.from(document.getElementById('subStaffInput').selectedOptions).map(o => o.value),
        sub_cast_names: Array.from(document.getElementById('subStaffInput').selectedOptions).map(o => o.text).join(','),
        base_fee: 0 // 設定シートから取得するロジックを後で追加
    };

    if (!payload.table_ids.length || !payload.main_cast_id) {
        alert('テーブルとメインスタッフを選択してください');
        return;
    }

    if (confirm('スプレッドシートへの直接書き込みを実行します。よろしいですか？')) {
        // GitHub Repository Dispatch API を叩く (実際にはトークンが必要なため、手順を別途案内)
        console.log('Dispatching POS Action:', payload);
        alert('送信準備完了（この後のAPI連携手順をエージェントに確認してください）');
    }
}
