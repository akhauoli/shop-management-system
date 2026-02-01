const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function syncSheets() {
    console.log('--- START SYNC PROCESS ---');

    // 1. 認証情報の取得とバリデーション (ここを一行ずつ修正)
    let credentials;
    try {
        const credsEnv = process.env.GOOGLE_SHEETS_CREDENTIALS;
        if (!credsEnv) {
            throw new Error('Environment variable GOOGLE_SHEETS_CREDENTIALS is missing.');
        }
        // 文字列として渡されたJSONをパース。改行などが含まれていても対応できるようにトリミング
        credentials = JSON.parse(credsEnv.trim());
        console.log('Successfully parsed GOOGLE_SHEETS_CREDENTIALS');
    } catch (e) {
        console.error('FATAL: Failed to parse Google Sheets Credentials:', e.message);
        process.exit(1);
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const MASTER_SHEET_ID = '1U0BOkVRDLyr27GiHsOgDcl_CmUMMP7JcOoAZXLx3G5Y';

    // データ取得用ヘルパー関数
    async function getRawData(range) {
        try {
            console.log(`Fetching range: ${range}`);
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: MASTER_SHEET_ID,
                range: range,
                valueRenderOption: 'UNFORMATTED_VALUE' // TRUE/FALSE を真偽値として取得
            });
            return response.data.values || [];
        } catch (e) {
            console.error(`Error fetching ${range}:`, e.message);
            // 接続エラーの場合は確実に失敗させる
            if (e.code === 401 || e.code === 403) {
                console.error('CRITICAL: Permission/Auth error with Google Sheets.');
                process.exit(1);
            }
            return [];
        }
    }

    try {
        // 1. スタッフ抽出 (4列目(D列)が TRUE の行のみ)
        const staffRaw = await getRawData('スタッフリスト!A1:D');
        const staff = staffRaw.slice(1)
            .filter(row => row[3] === true || String(row[3]).toUpperCase() === 'TRUE')
            .map(row => ({
                id: String(row[0] || ''),
                name: String(row[1] || '')
            }));

        // 2. テーブル抽出 (4列目(D列)が TRUE の行のみ)
        const tableRaw = await getRawData('テーブルマスタ!A1:D');
        const tables = tableRaw.slice(1)
            .filter(row => row[3] === true || String(row[3]).toUpperCase() === 'TRUE')
            .map(row => ({
                id: String(row[0] || ''),
                name: String(row[1] || '')
            }));

        // 3. 商品抽出 (ID, 名前, 3, 単価(4列目), ボトルフラグ(5列目))
        const itemRaw = await getRawData('メニューマスタ!A1:E');
        const items = itemRaw.slice(1).map(row => ({
            id: String(row[0] || ''),
            name: String(row[1] || ''),
            price: parseInt(row[3]) || 0,
            isBottle: row[4] === true || String(row[4]).toUpperCase() === 'TRUE'
        })).filter(item => item.id);

        // 4. 設定
        const settingsRaw = await getRawData('設定!A1:B20');
        const settings = {};
        settingsRaw.forEach(row => {
            if (row[0]) settings[String(row[0])] = row[1];
        });

        const masters = { staff, tables, items, settings };
        const stores = [{ id: MASTER_SHEET_ID, name: 'Léâme 本店' }];

        // 公開ディレクトリ data/ へ書き出し
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        fs.writeFileSync(path.join(dataDir, 'masters.json'), JSON.stringify(masters, null, 2));
        fs.writeFileSync(path.join(dataDir, 'stores.json'), JSON.stringify(stores, null, 2));

        console.log('--- SYNC COMPLETED SUCCESSFULLY ---');
        console.log(`Synced: ${staff.length} staff, ${tables.length} tables, ${items.length} items.`);
    } catch (err) {
        console.error('CRITICAL ERROR during sync execution:', err);
        process.exit(1);
    }
}

syncSheets();
