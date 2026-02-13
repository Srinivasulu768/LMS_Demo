import React, { useEffect, useState } from 'react';
import { getBatchMeetings, deleteZoomMeeting, deleteBatch, getVimeoVideos, deleteVimeoVideo } from '../api';
import DeleteBatchConfirmModal from './DeleteBatchConfirmModal';

const DeleteBatchModal = ({ batchId, batch, onClose, onDeleted }) => {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [vimeoVideos, setVimeoVideos] = useState([]);
    const [videoLoading, setVideoLoading] = useState(true);
    const [showBatchConfirm, setShowBatchConfirm] = useState(false);

    const fetchMeetings = async () => {
        setLoading(true);
        try {
            const res = await getBatchMeetings(batchId);
            setMeetings(res.data || []);
        } catch (err) {
            console.error('Failed to fetch meetings', err);
            setMeetings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (batchId) fetchMeetings();
        const fetchVideos = async () => {
            setVideoLoading(true);
            try {
                const res = await getVimeoVideos();
                // api.get returns axios response; use res.data
                setVimeoVideos(res.data || []);
            } catch (err) {
                console.error('Failed to fetch Vimeo videos', err);
                setVimeoVideos([]);
            } finally {
                setVideoLoading(false);
            }
        };
        fetchVideos();
    }, [batchId, batch]);

        // helper to compute filter tokens from batch
        const makeBatchTokens = () => {
            const tokens = [];
            const b = batch || {};
            if (b.id) tokens.push(String(b.id).toLowerCase());
            if (b.code) tokens.push(String(b.code).toLowerCase());
            if (b.name) tokens.push(String(b.name).toLowerCase());
            if (b.client) tokens.push(String(b.client).toLowerCase());
            return tokens.filter(Boolean);
        };

    const handleDeleteMeeting = async (meetingId) => {
        if (!window.confirm('Delete this meeting? This will remove the meeting but not recordings unless removed separately.')) return;
        try {
            await deleteZoomMeeting(meetingId);
            await fetchMeetings();
        } catch (err) {
            console.error('Failed to delete meeting', err);
            alert('Failed to delete meeting');
        }
    };

    // Recording deletion removed — recordings are no longer shown in this modal per UX change.

    const handleDeleteVimeo = async (videoId) => {
        if (!window.confirm('Delete this Vimeo video permanently?')) return;
        try {
            await deleteVimeoVideo(videoId);
            // refresh list
            const res = await getVimeoVideos();
            setVimeoVideos(res.data || res || []);
        } catch (err) {
            console.error('Failed to delete Vimeo video', err);
            alert('Failed to delete Vimeo video');
        }
    };

    const handleDeleteBatch = async () => {
        setBusy(true);
        try {
            await deleteBatch(batchId);
            onDeleted && onDeleted(batchId);
            setShowBatchConfirm(false);
        } catch (err) {
            console.error('Failed to delete batch', err);
            alert('Failed to delete batch: ' + (err.response?.data?.error || err.message));
        } finally {
            setBusy(false);
        }
    };

    // Compute related Vimeo videos for this batch using tokens and meeting Zoom IDs
    const relatedVideos = (vimeoVideos || []).filter(v => {
        if (!batch) return false;
        const content = `${v.name || ''} ${v.description || ''} ${v.link || ''}`.toLowerCase();

        // match batch tokens (name, code, client)
        const tokens = makeBatchTokens();
        for (const t of tokens) {
            if (t && content.includes(t)) return true;
        }

        // match meeting zoom IDs for this batch
        for (const m of (meetings || [])) {
            const zid = String(m.zoomMeetingId || '').toLowerCase();
            if (zid && content.includes(zid)) return true;
        }

        return false;
    });

    return (
        <>
            {!showBatchConfirm && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Delete Batch - Manage Meetings & Recordings</h5>
                                <button type="button" className="btn-close" onClick={onClose}>&times;</button>
                            </div>
                            <div className="modal-body">
                                <div className="row">
                                    <div className="col-md-6">
                                        <h6>Meetings</h6>
                                        {loading ? <p>Loading meetings...</p> : (
                                            meetings.length === 0 ? <p className="text-muted">No meetings found for this batch.</p> : (
                                                <ul className="list-group">
                                                    {meetings.map(m => (
                                                        <li key={m.id || m._id || `${m.day}-${m.session}-${m.zoomMeetingId}`} className="list-group-item">
                                                            <div className="d-flex justify-content-between align-items-start">
                                                                <div>
                                                                    <div><strong>Day:</strong> {m.day ?? 'N/A'} &nbsp; <strong>Session:</strong> {m.session ?? 'N/A'}</div>
                                                                    <div><strong>Zoom ID:</strong> {m.zoomMeetingId ?? 'N/A'}</div>
                                                                    <div><strong>Date:</strong> {m.date ?? 'N/A'} &nbsp; <strong>Time:</strong> {m.time ?? 'N/A'}</div>
                                                                    {m.joinUrl && <div><a href={m.joinUrl} target="_blank" rel="noreferrer">Join Link</a></div>}
                                                                </div>
                                                                <div>
                                                                    <button className="btn btn-sm btn-danger mb-2" onClick={() => handleDeleteMeeting(m.id || m._id || m.zoomMeetingId)}>Delete Meeting</button>
                                                                </div>
                                                            </div>

                                                            {/* Recordings hidden in Delete Batch modal per request */}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )
                                        )}
                                    </div>

                                    <div className="col-md-6">
                                        <h6>Vimeo Videos (Related)</h6>
                                        {videoLoading ? <p>Loading Vimeo videos...</p> : (
                                            relatedVideos.length === 0 ? (
                                                <p className="text-muted">No related Vimeo videos found for this batch.</p>
                                            ) : (
                                                <ul className="list-group">
                                                    {relatedVideos.map(v => (
                                                        <li key={v.id || v.uri || v.name} className="list-group-item d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <div><strong>{v.name}</strong></div>
                                                                <div><small className="text-muted">{v.description}</small></div>
                                                                <div><a href={v.link} target="_blank" rel="noreferrer">Open on Vimeo</a></div>
                                                            </div>
                                                            <div>
                                                                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteVimeo(v.id)}>Delete</button>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )
                                        )}
                                        <hr />

                                        {/* Zoom recordings placeholder */}
                                        <h6>Zoom Recordings</h6>
                                        <p className="text-muted">Zoom recordings are not fetched in this view yet. Fetching and management will be added later.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                                <button type="button" className="btn btn-danger" onClick={() => setShowBatchConfirm(true)} disabled={busy}>{busy ? 'Deleting...' : 'Delete Batch'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DeleteBatchConfirmModal
                show={showBatchConfirm}
                batch={batch}
                relatedVideos={relatedVideos}
                onClose={() => setShowBatchConfirm(false)}
                onConfirm={handleDeleteBatch}
            />
        </>
    );
};

export default DeleteBatchModal;
