import React from 'react';

const DeleteBatchConfirmModal = ({ show, batch, relatedVideos = [], onClose, onConfirm }) => {
    if (!show) return null;

    const backdrop = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 };
    const box = { maxWidth: '600px', width: '100%' };

    return (
        <div style={backdrop}>
            <div className="modal-dialog" style={box}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Delete Batch: {batch?.name || 'Batch'}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <p><strong>Warning:</strong> Deleting this batch will remove the batch record and associated meetings.</p>
                        <ul>
                            <li>Zoom meetings associated with this batch will be deleted.</li>
                            <li>Zoom cloud recordings may be deleted.</li>
                            <li>Vimeo videos that match this batch will be deleted if present.</li>
                        </ul>
                        {relatedVideos && relatedVideos.length > 0 ? (
                            <div>
                                <p>The following Vimeo videos appear related to this batch and will be deleted:</p>
                                <ul className="list-group mb-3">
                                    {relatedVideos.map(v => (
                                        <li key={v.id || v.uri || v.name} className="list-group-item d-flex justify-content-between align-items-center">
                                            <div>
                                                <div><strong>{v.name}</strong></div>
                                                <div><small className="text-muted">{v.description}</small></div>
                                            </div>
                                            <div><a href={v.link} target="_blank" rel="noreferrer">Open</a></div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <p className="text-muted">No matching Vimeo videos were found for this batch.</p>
                        )}
                        <p>Please ensure you have backups or have deleted important recordings before proceeding. Click <strong>Confirm</strong> to delete the batch and related data.</p>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-danger" onClick={onConfirm}>Confirm Delete Batch</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteBatchConfirmModal;
