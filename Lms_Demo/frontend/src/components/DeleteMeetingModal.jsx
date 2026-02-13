import React, { useEffect, useState } from 'react';
import { getBatchMeetings, deleteZoomMeeting, getVimeoVideos, deleteVimeoVideo, getBatches } from '../api';

const DeleteMeetingModal = ({ batchId, onClose, onDeleted }) => {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [vimeoVideos, setVimeoVideos] = useState([]);
    const [vimeoLoading, setVimeoLoading] = useState(true);
    const [vimeoDeletingId, setVimeoDeletingId] = useState(null);
    const [vimeoErrorMsg, setVimeoErrorMsg] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            setVimeoLoading(true);
            let meetingsRes = [];
            try {
                const response = await getBatchMeetings(batchId);
                meetingsRes = response.data || [];
                setMeetings(meetingsRes);
            } catch (error) {
                console.error("Failed to fetch meetings", error);
                setMeetings([]);
            } finally {
                setLoading(false);
            }

            try {
                const vres = await getVimeoVideos();
                const allVideos = vres.data || [];

                // get batch tokens
                try {
                    const batchesRes = await getBatches();
                    const batches = batchesRes.data || [];
                    const batchObj = batches.find(b => String(b.id) === String(batchId)) || {};
                    const tokens = [String(batchObj.name || '').toLowerCase(), String(batchObj.code || '').toLowerCase(), String(batchObj.client || '').toLowerCase()].filter(Boolean);

                    const meetingIds = (meetingsRes || []).map(m => String(m.zoomMeetingId || '').toLowerCase()).filter(Boolean);

                    const filtered = allVideos.filter(v => {
                        const content = `${v.name || ''} ${v.description || ''} ${v.link || ''}`.toLowerCase();
                        for (const t of tokens) {
                            if (t && content.includes(t)) return true;
                        }
                        for (const zid of meetingIds) {
                            if (zid && content.includes(zid)) return true;
                        }
                        return false;
                    });

                    setVimeoVideos(filtered);
                } catch (err) {
                    console.error('Failed to fetch batches for Vimeo filtering', err);
                    setVimeoVideos([]);
                }
            } catch (err) {
                console.error('Failed to fetch Vimeo videos', err);
                setVimeoVideos([]);
            } finally {
                setVimeoLoading(false);
            }
        };

        if (batchId) fetchAll();
    }, [batchId]);

    const handleDelete = async (meetingId, zoomMeetingId) => {
        if (!window.confirm("Are you sure you want to delete this meeting?")) return;
        try {
            await deleteZoomMeeting(meetingId);
            setMeetings(meetings.filter(m => m.id !== meetingId));
            if (onDeleted) onDeleted(meetingId, zoomMeetingId);
        } catch (error) {
            console.error("Failed to delete meeting", error);
            alert("Failed to delete meeting");
        }
    };

    const handleDeleteVimeo = async (videoId) => {
        if (!videoId) {
            alert('Vimeo video not available to delete.');
            return;
        }
        if (!window.confirm('Are you sure you want to delete this Vimeo video?')) return;
        setVimeoErrorMsg(null);
        setVimeoDeletingId(videoId);
        try {
            await deleteVimeoVideo(videoId);
            setVimeoVideos(prev => (prev || []).filter(v => v.id !== videoId));
        } catch (err) {
            console.error('Failed to delete Vimeo video', err);
            const msg = err?.response?.data?.error || err?.message || 'Failed to delete Vimeo video.';
            setVimeoErrorMsg(msg);
            alert(msg);
        } finally {
            setVimeoDeletingId(null);
        }
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Delete Zoom Meeting</h5>
                        <button type="button" className="btn-close" onClick={onClose}>&times;</button>
                    </div>
                    <div className="modal-body">
                        {/* Meetings section */}
                        <h6>Meetings</h6>
                        {loading ? <p>Loading meetings...</p> : (
                            meetings.length === 0 ? <p>No meetings found for this batch.</p> : (
                                <ul className="list-group">
                                    {meetings.map((meeting) => (
                                        <li key={meeting.id} className="list-group-item d-flex justify-content-between align-items-center" style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee' }}>
                                            <div>
                                                <div><strong>Day:</strong> {meeting.day ?? 'N/A'} &nbsp; <strong>Session:</strong> {meeting.session ?? 'N/A'}</div>
                                                <div><small>Zoom ID: {meeting.zoomMeetingId ?? 'N/A'}</small></div>
                                            </div>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(meeting.id, meeting.zoomMeetingId)}>Delete</button>
                                        </li>
                                    ))}
                                </ul>
                            )
                        )}

                        {/* Vimeo videos section (filtered to this batch) */}
                        <h6>Class Recordings (Vimeo)</h6>
                        {vimeoLoading ? <p>Loading Vimeo videos...</p> : (
                            vimeoVideos.length === 0 ? <p>No Vimeo videos found for this batch.</p> : (
                                <>
                                    {vimeoErrorMsg && <div className="alert alert-danger">{vimeoErrorMsg}</div>}
                                    <ul className="list-group">
                                        {vimeoVideos.map(v => (
                                            <li key={v.id || v.name} className="list-group-item d-flex justify-content-between align-items-center" style={{ marginBottom: '8px' }}>
                                                <div>
                                                    <div><strong>{v.name}</strong></div>
                                                    <div><small>{v.description}</small></div>
                                                </div>
                                                <div>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        disabled={!v.id || vimeoDeletingId === v.id}
                                                        onClick={() => handleDeleteVimeo(v.id)}
                                                    >
                                                        {vimeoDeletingId === v.id ? 'Deleting…' : 'Delete'}
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )
                        )}


                        {/* Zoom Recordings */}
                        <h6>Zoom Recordings</h6>
                        <p className="text-muted">Recording details are not displayed here.</p>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteMeetingModal;
