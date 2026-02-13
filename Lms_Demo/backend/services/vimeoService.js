const axios = require('axios');

const getVimeoVideos = async () => {
    const accessToken = process.env.VIMEO_ACCESS_TOKEN;
    try {
        const response = await axios.get('https://api.vimeo.com/me/videos', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: {
                fields: 'uri,name,description,link,embed,created_time,duration'
            }
        });
        return response.data.data;
    } catch (error) {
        console.error('Error fetching Vimeo videos', error.response?.data || error.message);
        throw error;
    }
};

const deleteVimeoVideo = async (videoId) => {
    const accessToken = process.env.VIMEO_ACCESS_TOKEN;
    // Video ID is usually the numeric part capable of being extracted from URI
    // URI format: /videos/123456789
    const uri = `/videos/${videoId}`;

    try {
        await axios.delete(`https://api.vimeo.com${uri}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return true;
    } catch (error) {
        console.error('Error deleting Vimeo video', error.response?.data || error.message);
        throw error;
    }
};

module.exports = {
    getVimeoVideos,
    deleteVimeoVideo
};
