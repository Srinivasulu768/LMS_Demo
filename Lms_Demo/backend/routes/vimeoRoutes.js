const express = require('express');
const router = express.Router();
const vimeoService = require('../services/vimeoService');

// Get all Vimeo videos
router.get('/', async (req, res) => {
    try {
        const videos = await vimeoService.getVimeoVideos();
        // Extract relevant info
        const result = videos.map(video => ({
            uri: video.uri,
            id: video.uri.split('/').pop(),
            name: video.name,
            description: video.description,
            link: video.link,
            duration: video.duration,
            created_time: video.created_time,
            embed: video.embed ? video.embed.html : null
        }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Vimeo video
router.delete('/:videoId', async (req, res) => {
    const { videoId } = req.params;
    try {
        await vimeoService.deleteVimeoVideo(videoId);
        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
