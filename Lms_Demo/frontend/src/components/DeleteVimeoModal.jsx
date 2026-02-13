import React, { useState } from 'react';

const DeleteVimeoModal = ({ show, onClose, video, onDeleteAttempt }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    if (!show || !video) return null;

    const handleConfirm = async () => {
        setLoading(true);
        setMessage(null);
        try {
            // delegate actual deletion logic to parent via callback
            await onDeleteAttempt(video);
            setLoading(false);
        } catch (err) {
            setLoading(false);
            setMessage(err?.message || 'Failed to delete. Ensure Zoom recording is deleted first.');
        }
    };

    const backdropStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '1rem'
    };

    const dialogStyle = {
        maxWidth: '600px',
        width: '100%'
    };

    return (
        <div style={backdropStyle}>
            <div className="modal-dialog" role="dialog" style={dialogStyle}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Delete Vimeo Video</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <p><strong>Warning:</strong> Please delete the corresponding Zoom recording first. If the Zoom recording still exists, deleting the Vimeo video is not allowed here.</p>
                        <p><strong>Video:</strong> {video.name}</p>
                        {message && <div className="alert alert-danger">{message}</div>}
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                        <button className="btn btn-danger" onClick={handleConfirm} disabled={loading}>
                            {loading ? 'Checking & Deleting…' : 'Delete (Check Zoom first)'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteVimeoModal;
