const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function syncSheets() {
    console.log('--- START SYNC PROCESS (Strict GAS Logic) ---');

    let credentials;
    try {
        const credsEnv = process.env.GOOGLE_SHEETS_CREDENTIALS;
        if (!credsEnv) throw new Error('GOOGLE_SHEETS_CREDENTIALS missing.');
        credentials = JSON.parse(credsEnv.trim());
    } catch (e) {
        console.error('FATAL: Auth Parse Error:', e.message);
        process.exit(1);
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const MASTER_SHEET_ID = '1U0BOkVRDLyr27GiHsOgDcl_CmUMMP7JcOoAZXLx3G5Y';

    async function getRawData(range) {
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: MASTER_SHEET_ID,
                range: range,
                valueRenderOption: 'FORMATTED_VALUE' // 見たままの文字列（"TRUE"など）を取得
            });
            return response.data.values || [];
        } catch (e) {
            console.error(`Error fetching ${range}:`, e.message);
            if (e.code === 401 || e.code === 403) process.exit(1);
            return [];
        }
    }

    // 判定用ヘルパー: 文字列の "TRUE" または真偽値の TRUE をフレキシブルに判定
    const isTrue = (val) => {
        if (typeof val === 'boolean') return val === true;
        if (typeof val === 'string') return val.trim().toUpperCase() === 'TRUE';
        return false;
    };

    try {
        // 1. スタッフ抽出 (4列目(D列)が TRUE のみ)
        const staffRaw = await getRawData('スタッフリスト!A1:D');
        const staff = staffRaw.slice(1)
            .filter(row => isTrue(row[3]))
            .map(row => ({
                id: String(row[0] || ''),
                name: String(row[1] || '')
            }));

        // 2. テーブル抽出 (4列目(D列)が TRUE のみ)
        const tableRaw = await getRawData('テーブルマスタ!A1:D');
        const tables = tableRaw.slice(1)
            .filter(row => isTrue(row[3]))
            .map(row => ({
                id: String(row[0] || ''),
                name: String(row[1] || '')
            }));

        // 3. 商品抽出 (ID, 名前, ?, 単価(D列), ボトル(E列))
        const itemRaw = await getRawData('メニューマスタ!A1:E');
        const items = itemRaw.slice(1).map(row => ({
            id: String(row[0] || ''),
            name: String(row[1] || ''),
            price: parseInt(String(row[3]).replace(/[^0-9]/g, '')) || 0,
            isBottle: isTrue(row[4])
        })).filter(item => item.id);

        // 4. 設定
        const settingsRaw = await getRawData('設定!A1:B20');
        const settings = {};
        settingsRaw.forEach(row => {
            if (row[0]) settings[String(row[0])] = row[1];
        });

        const masters = { staff, tables, items, settings };
        const stores = [{ id: MASTER_SHEET_ID, name: 'Léâme 本店' }];

        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        fs.writeFileSync(path.join(dataDir, 'masters.json'), JSON.stringify(masters, null, 2));
        fs.writeFileSync(path.join(dataDir, 'stores.json'), JSON.stringify(stores, null, 2));

        console.log(`SYNC SUCCESS: ${staff.length} staff, ${tables.length} tables, ${items.length} items loaded.`);
    } catch (err) {
        console.error('FATAL EXECUTION ERROR:', err);
        process.exit(1);
    }
}

syncSheets();
