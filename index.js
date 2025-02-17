require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

// Configuración de Google Sheets
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(fs.readFileSync('sheets.json', 'utf8')),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const SHEET_NAME = process.env.MENSAJE_HOJA;

// Configuración de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Cliente de WhatsApp está listo');
});

client.on('message', async message => {
    const { from, body } = message;
    const fecha = new Date().toLocaleString('es-ES', { timeZone: 'America/Argentina/Buenos_Aires' });

    try {
        // Guardar el mensaje en Google Sheets
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: `${SHEET_NAME}!A:C`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[fecha, from, body]] }
        });
        console.log('Mensaje guardado en Sheets:', body);

        // Buscar respuesta automática en la columna D
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SHEET_NAME}!D:D`
        });

        const respuestas = response.data.values || [];
        const respuestaAutomatica = respuestas.length > 0 ? respuestas[respuestas.length - 1][0] : 'No se encontró respuesta';

        // Enviar respuesta automática al usuario
        await client.sendMessage(from, respuestaAutomatica);
        console.log('Respuesta enviada:', respuestaAutomatica);
    } catch (error) {
        console.error('Error procesando mensaje:', error);
    }
});

client.initialize();
