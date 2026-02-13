const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();

const checkZoom = async () => {
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    console.log('Checking Zoom Credentials...');
    console.log('Account ID:', accountId);
    console.log('Client ID:', clientId ? 'Set' : 'Missing');
    console.log('Client Secret:', clientSecret ? 'Set' : 'Missing');

    const tokenUrl = 'https://zoom.us/oauth/token';
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const response = await axios.post(
            tokenUrl,
            querystring.stringify({ grant_type: 'account_credentials', account_id: accountId }),
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log('Success! Access Token retrieved.');
        console.log('Access Token:', response.data.access_token.substring(0, 10) + '...');

    } catch (error) {
        console.error('Zoom Authentication Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

checkZoom();
