
// use built-in fetch (Node 18+)
import dotenv from 'dotenv';
dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

console.log('--- WhatsApp Debug Info ---');
console.log('Phone Number ID:', WHATSAPP_PHONE_NUMBER_ID);
console.log('Token (first 10 chars):', WHATSAPP_TOKEN?.substring(0, 10) + '...');

async function debugToken() {
    try {
        console.log('\n1. Checking Token Debug Info...');
        // We need the App ID and App Secret for debug_token, or we can just try to fetch the phone number info
        const response = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}`, {
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
        });
        
        const data = await response.json();
        console.log('Phone Number Metadata:', JSON.stringify(data, null, 2));
        
        if (data.error) {
            console.error('Error Code:', data.error.code);
            console.error('Error Subcode:', data.error.error_subcode);
            console.error('Error Message:', data.error.message);
        } else {
            console.log('SUCCESS: Token has access to this Phone Number ID.');
        }

        console.log('\n2. Trying to fetch WABA (WhatsApp Business Account) ID...');
        if (data.whatsapp_business_account_id) {
            const wabaId = data.whatsapp_business_account_id;
            console.log('WABA ID:', wabaId);
            const wabaResponse = await fetch(`https://graph.facebook.com/v20.0/${wabaId}`, {
                headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
            });
            const wabaData = await wabaResponse.json();
            console.log('WABA Metadata:', JSON.stringify(wabaData, null, 2));
        }

    } catch (error) {
        console.error('Debug script failed:', error);
    }
}

debugToken();
