import React from 'react';

const JoinMeetingModal = ({ meetUrl, onClose }) => {
    return (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Meeting Created!</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body text-center">
                        <p>The Zoom meeting has been created successfully.</p>
                        <a href={meetUrl} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-lg">
                            Join Meeting
                        </a>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JoinMeetingModal;
