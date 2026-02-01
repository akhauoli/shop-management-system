/**
 * Léâme POS System - Main Application Logic
 */

const CONFIG = {
    DATA_PATH: './data/'
};

let state = {
    currentTab: 'reception',
    stores: [],
    selectedStoreId: null,
    masters: null,
    tickets: []
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initialization started...');
    initApp();
});

async function initApp() {
    setupEventListeners();
    await fetchStoreList();
    renderStoreSelector();
    // 起動時に現在のタブを確認し、データが必要ならロード
    await loadStoreData();
    render();
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
        const cacheBuster = `?v=${new Date().getTime()}`;
        const url = `./data/stores.json${cacheBuster}`;
        console.log('Fetching stores from:', url);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        state.stores = await response.json();
        if (state.stores.length > 0) {
            state.selectedStoreId = state.stores[0].id;
        }
    } catch (e) {
        console.error('Failed to fetch stores list:', e);
        showError('店舗リストの読み込みに失敗しました', e.message, './data/stores.json');
        // フォールバック設定
        state.stores = [{ id: '1U0BOkVRDLyr27GiHsOgDcl_CmUMMP7JcOoAZXLx3G5Y', name: 'Léâme 本店' }];
        state.selectedStoreId = state.stores[0].id;
    }
}

function renderStoreSelector() {
    const selector = document.getElementById('storeSelect');
    if (!selector) return;
    selector.innerHTML = state.stores.map(s =>
        `<option value="${s.id}">${s.name}</option>`
    ).join('');
}

function switchTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    if (!state.masters) {
        loadStoreData();
    } else {
        render();
    }
}

async function loadStoreData() {
    try {
        const cacheBuster = `?v=${new Date().getTime()}`;
        const url = `./data/masters.json${cacheBuster}`;
        console.log('Loading masters from:', url);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        state.masters = await response.json();
        console.log('Léâme Masters Loaded:', state.masters);
        render();
    } catch (e) {
        console.error('Failed to load master data:', e);
        showError('マスターデータの読み込みに失敗しました', e.message, './data/masters.json');
    }
}

function showError(title, message, path) {
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `
            <div class="glass-card error-card fade-in">
                <h3>データ読み込みエラー</h3>
                <p><strong>${title}</strong></p>
                <div style="background: rgba(255,0,0,0.1); padding: 10px; border-radius: 8px; margin: 10px 0; text-align: left; font-family: monospace; font-size: 0.8rem;">
                    Error: ${message}<br>
                    Path: ${path}
                </div>
                <button class="primary-btn" onclick="location.reload()">再読み込みを試す</button>
            </div>
        `;
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
    if (!state.masters || !state.masters.staff || !state.masters.tables) {
        return '<div class="card"><p>データが空です。スプレッドシートの有効フラグをご確認ください。</p></div>';
    }

    // 日本語キー（GAS抽出結果）に対応
    const tables = state.masters.tables.map(t =>
        `<option value="${t['テーブルID'] || t.id}">${t['テーブル名'] || t.name}</option>`
    ).join('');

    const staffs = state.masters.staff.map(s =>
        `<option value="${s['キャストID'] || s.id}">${s['キャスト名'] || s.name}</option>`
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
    const REPO_OWNER = 'akhauoli';
    const REPO_NAME = 'shop-management-system';

    let githubToken = localStorage.getItem('POS_GH_TOKEN');
    if (!githubToken) {
        githubToken = prompt('GitHub PAT を入力してください');
        if (githubToken) localStorage.setItem('POS_GH_TOKEN', githubToken);
        else return;
    }

    const payload = {
        customer_type: document.getElementById('customerType').value,
        people_count: parseInt(document.getElementById('peopleInput').value),
        table_ids: Array.from(document.getElementById('tableInput').selectedOptions).map(o => o.value),
        table_names: Array.from(document.getElementById('tableInput').selectedOptions).map(o => o.text).join(','),
        main_cast_id: document.getElementById('staffInput').value,
        main_cast_name: document.getElementById('staffInput').options[document.getElementById('staffInput').selectedIndex].text,
        sub_cast_ids: Array.from(document.getElementById('subStaffInput').selectedOptions).map(o => o.value),
        sub_cast_names: Array.from(document.getElementById('subStaffInput').selectedOptions).map(o => o.text).join(','),
        base_fee: 3000
    };

    if (!payload.table_ids.length || !payload.main_cast_id) {
        alert('テーブルとメインスタッフを選択してください');
        return;
    }

    if (!confirm('スプレッドシートへ送信します。よろしいですか？')) return;

    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event_type: 'pos_action',
                client_payload: {
                    action: 'CREATE_TICKET',
                    payload: payload
                }
            })
        });

        if (response.ok) {
            alert('送信成功！反映まで数十秒お待ちください。');
            location.reload();
        } else {
            const err = await response.json();
            if (response.status === 401) localStorage.removeItem('POS_GH_TOKEN');
            throw new Error(err.message || 'API送信失敗');
        }
    } catch (e) {
        alert('エラーが発生しました: ' + e.message);
    }
}
