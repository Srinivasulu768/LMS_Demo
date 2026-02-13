import React from 'react';

const VimeoPlayer = ({ videoId, height = 360 }) => {
    if (!videoId) return null;

    const style = {
        position: 'relative',
        paddingBottom: '56.25%', // 16:9
        height: 0,
        overflow: 'hidden',
        width: '100%'
    };

    const iframeStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 0
    };

    return (
        <div style={style} className="vimeo-player-wrapper">
            <iframe
                src={`https://player.vimeo.com/video/${videoId}`}
                style={iframeStyle}
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={`Vimeo video ${videoId}`}
            />
        </div>
    );
};

export default VimeoPlayer;
