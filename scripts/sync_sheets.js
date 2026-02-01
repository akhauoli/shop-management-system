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

    async function getSheetData(sheets, spreadsheetId, range) {
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
                return item;
            });
        } catch (e) {
            console.error(`Error fetching range ${range}:`, e.message);
            return [];
        }
    }

    try {
        const data = {
            stores: [{ id: MASTER_SHEET_ID, name: 'Léâme 本店' }],
            masters: {
                products: await getSheetData(sheets, MASTER_SHEET_ID, '商品!A1:Z'),
                staff: await getSheetData(sheets, MASTER_SHEET_ID, 'スタッフ!A1:Z'),
                tables: await getSheetData(sheets, MASTER_SHEET_ID, 'テーブル!A1:Z'),
                settings: await getSheetData(sheets, MASTER_SHEET_ID, '設定!A1:B')
            }
        };

        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(path.join(dataDir, 'masters.json'), JSON.stringify(data.masters, null, 2));
        fs.writeFileSync(path.join(dataDir, 'stores.json'), JSON.stringify(data.stores, null, 2));

        console.log('Successfully synced all Léâme management data to ./data/');
    } catch (err) {
        console.error('The API returned an error: ' + err);
    }
}

syncSheets();
