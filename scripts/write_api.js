const { google } = require('googleapis');
const crypto = require('crypto');

async function writeToSheet() {
    const action = process.env.ACTION;
    const payload = JSON.parse(process.env.PAYLOAD);
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
        const timezoneOffset = 9 * 60; // JST
        const jstDate = new Date(now.getTime() + timezoneOffset * 60000);

        // 1. 伝票シートへのAppend ([ID, 区分, 人数, TableIDs, TableNames, MainID, MainName, SubIDs, SubNames, Checkin, Total, Back, Discount, Status, Elapsed, Running, LastStart])
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: '伝票!A:Q',
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
                    jstDate.toLocaleString('ja-JP'),
                    0, 0, 0, 'ACTIVE', 0, false, 0
                ]]
            }
        });

        // 2. 明細シートへの初期「基本料金」追加 ([TicketID, LineID, ProdID, ProdName, Qty, Price, ProvidedBy, KeepName, TS])
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: '明細!A:I',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    ticketId,
                    crypto.randomUUID(),
                    'basic',
                    '基本料金',
                    payload.people_count,
                    payload.base_fee,
                    '',
                    '',
                    jstDate.toLocaleString('ja-JP')
                ]]
            }
        });

        process.stdout.write(JSON.stringify({ success: true, ticket_id: ticketId }));
    }

    if (action === 'ADD_LINE') {
        // ... 商品追加ロジックの移植
    }

    if (action === 'CHECKOUT') {
        // ... 精算ロジック、売上サマリへの書き込み、ステータス更新の移植
    }
}

writeToSheet().catch(e => {
    process.stderr.write(JSON.stringify({ success: false, error: e.message }));
    process.exit(1);
});
