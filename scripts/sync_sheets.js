const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function syncSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const MASTER_SHEET_ID = '1U0BOkVRDLyr27GiHsOgDcl_CmUMMP7JcOoAZXLx3G5Y';

    async function getSheetData(sheets, spreadsheetId, range, idCandidates = [], nameCandidates = []) {
        try {
            const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
            const rows = response.data.values;
            if (!rows || rows.length === 0) return [];

            const headers = rows[0];
            return rows.slice(1).map(row => {
                const item = {};
                headers.forEach((header, index) => {
                    item[header] = row[index] || '';
                });

                // IDマッピング
                if (idCandidates.length > 0) {
                    const idKey = idCandidates.find(c => headers.includes(c));
                    if (idKey) item.id = item[idKey];
                }
                // 名前マッピング
                if (nameCandidates.length > 0) {
                    const nameKey = nameCandidates.find(c => headers.includes(c));
                    if (nameKey) item.name = item[nameKey];
                }

                return item;
            }).filter(item => Object.values(item).some(v => v !== ''));
        } catch (e) {
            console.error(`Error fetching range ${range}:`, e.message);
            return [];
        }
    }

    try {
        console.log('Starting sync from Google Sheets...');

        const staff = await getSheetData(sheets, MASTER_SHEET_ID, 'スタッフリスト!A1:Z', ['ID', 'コード'], ['名前', '名称']);
        const tables = await getSheetData(sheets, MASTER_SHEET_ID, 'テーブルマスタ!A1:Z', ['ID', 'コード'], ['名前', '名称']);
        const items = await getSheetData(sheets, MASTER_SHEET_ID, 'メニューマスタ!A1:Z');
        const settings = await getSheetData(sheets, MASTER_SHEET_ID, '設定!A1:B');

        const data = {
            stores: [{ id: MASTER_SHEET_ID, name: 'Léâme 本店' }],
            masters: {
                staff,
                tables,
                items,
                settings
            }
        };

        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(path.join(dataDir, 'masters.json'), JSON.stringify(data.masters, null, 2));
        fs.writeFileSync(path.join(dataDir, 'stores.json'), JSON.stringify(data.stores, null, 2));

        console.log(`Successfully synced all Léâme management data to ./data/ using spreadsheet: ${MASTER_SHEET_ID}`);
    } catch (err) {
        console.error('CRITICAL ERROR during sync: ' + err);
        process.exit(1);
    }
}

syncSheets();
