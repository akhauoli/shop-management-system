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

    try {
        // 店舗一覧の取得
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SHEET_ID,
            range: '店舗一覧!A2:B',
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found.');
            return;
        }

        const stores = rows.map(row => ({
            id: row[0],
            name: row[1]
        }));

        const dataDir = path.join(__dirname, '../public/data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(
            path.join(dataDir, 'stores.json'),
            JSON.stringify(stores, null, 2)
        );

        console.log('Successfully synced store data!');
    } catch (err) {
        console.error('The API returned an error: ' + err);
    }
}

syncSheets();
