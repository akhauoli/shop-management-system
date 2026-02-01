const { google } = require('googleapis');
const crypto = require('crypto');

async function writeToSheet() {
    const action = process.env.ACTION;
    const payloadBuffer = process.env.PAYLOAD;
    if (!payloadBuffer) {
        console.error('No PAYLOAD provided');
        process.exit(1);
    }
    const payload = JSON.parse(payloadBuffer);
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
    const spreadsheetId = '1U0BOkVRDLyr27GiHsOgDcl_CmUMMP7JcOoAZXLx3G5Y';

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    if (action === 'CREATE_TICKET') {
        const ticketId = crypto.randomUUID();
        const now = new Date();
        const jstDate = new Date(now.getTime() + 9 * 60 * 60000);
        const timestamp = jstDate.toISOString().replace('T', ' ').substring(0, 19);

        // 1. 伝票シートへの追加
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: '伝票!A:N',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    ticketId,
                    payload.customer_type,
                    payload.people_count,
                    payload.table_ids.join(','),
                    payload.table_names,
                    payload.main_cast_id,
                    payload.main_cast_name,
                    payload.sub_cast_ids.join(','),
                    payload.sub_cast_names,
                    timestamp,
                    0, 0, 0, 'OPEN'
                ]]
            }
        });

        // 2. 明細シートへ basic を人数分追加
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: '明細!A:G',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    ticketId,
                    'basic',
                    '基本セット',
                    payload.people_count,
                    payload.base_fee || 3000,
                    (payload.base_fee || 3000) * payload.people_count,
                    timestamp
                ]]
            }
        });

        console.log(`Ticket Created: ${ticketId} with auto basic lines.`);
    }

    if (action === 'CHECKOUT') {
        const ticketId = payload.ticket_id;

        // 設定取得
        const settingsRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: '設定!A1:B20' });
        const settings = {};
        (settingsRes.data.values || []).forEach(r => settings[r[0]] = r[1]);

        const svRate = parseFloat(settings['サービス料率']) || 0.1;
        const taxRate = parseFloat(settings['消費税率']) || 0.1;

        // 明細取得
        const detailRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: '明細!A:G' });
        const ticketLines = (detailRes.data.values || []).filter(r => r[0] === ticketId);

        let subtotal = ticketLines.reduce((sum, r) => sum + (parseInt(r[5]) || 0), 0);
        subtotal += (parseInt(payload.discount) || 0);

        // 厳密計算 (Math.floor)
        const serviceFee = Math.floor(subtotal * svRate);
        const tax = Math.floor(subtotal * taxRate);
        const total = subtotal + serviceFee + tax;

        // 売上サマリ記録
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: '売上サマリ!A:I',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    new Date().toISOString(),
                    ticketId,
                    subtotal,
                    serviceFee,
                    tax,
                    total,
                    payload.payment_method || '現金',
                    payload.main_cast_name,
                    'DONE'
                ]]
            }
        });

        console.log(`Checkout for ${ticketId} complete. Total: ${total}`);
    }
}

writeToSheet().catch(e => {
    console.error(e);
    process.exit(1);
});
