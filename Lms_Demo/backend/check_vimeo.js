const axios = require('axios');
require('dotenv').config();

const checkVimeo = async () => {
    const accessToken = process.env.VIMEO_ACCESS_TOKEN;
    console.log('Using Vimeo Token:', accessToken ? accessToken.substring(0, 5) + '...' : 'None');

    try {
        const response = await axios.get('https://api.vimeo.com/me/videos', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        console.log('Status:', response.status);
        console.log('Videos Found:', response.data.data.length);
        if (response.data.data.length > 0) {
            console.log('First Video:', response.data.data[0].name);
        } else {
            console.log('No videos found in the account.');
        }
    } catch (error) {
        console.error('Error fetching Vimeo videos:', error.response ? error.response.status : error.message);
        if (error.response && error.response.data) {
            console.error('Error details:', error.response.data);
        }
    }
};

checkVimeo();
