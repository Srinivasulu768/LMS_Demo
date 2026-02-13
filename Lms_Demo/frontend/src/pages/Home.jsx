import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBatches, createZoomMeeting, getVimeoVideos, deleteVimeoVideo, deleteZoomRecording, getBatchMeetings, deleteBatch, deleteZoomMeetingByZoomId } from '../api';
import VimeoPlayer from '../components/VimeoPlayer';
import CreateMeetingModal from '../components/CreateMeetingModal';
import DeleteMeetingModal from '../components/DeleteMeetingModal';
import DeleteBatchModal from '../components/DeleteBatchModal';
import DeleteVimeoModal from '../components/DeleteVimeoModal';

const Home = () => {
    const [batches, setBatches] = useState([]);
    const [videos, setVideos] = useState([]);
    const [meetingsByBatch, setMeetingsByBatch] = useState({});

    // Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedBatchId, setSelectedBatchId] = useState(null);
    const [selectedBatch, setSelectedBatch] = useState(null);

    // New: track which batch meeting lists are visible
    const [expandedBatches, setExpandedBatches] = useState({});

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteBatchModal, setShowDeleteBatchModal] = useState(false);

    const [processingMessage, setProcessingMessage] = useState(null);
    // embedded player state: { vimeoId, kind: 'video'|'recording', id }
    const [embeddedPlayer, setEmbeddedPlayer] = useState({ vimeoId: null, kind: null, id: null });

    const PLACEHOLDER_KEY = 'class_recording_placeholders_v1';

    const PENDING_MEETINGS_KEY = 'pending_meeting_recordings_v1';

    const loadPendingMeetings = () => {
        try {
            const raw = localStorage.getItem(PENDING_MEETINGS_KEY);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to load pending meetings', e);
            return [];
        }
    };

    const savePendingMeetings = (arr) => {
        try {
            localStorage.setItem(PENDING_MEETINGS_KEY, JSON.stringify(arr || []));
        } catch (e) {
            console.error('Failed to save pending meetings', e);
        }
    };

    const addPendingMeeting = (entry) => {
        const arr = loadPendingMeetings();
        // avoid duplicates by zoomMeetingId
        if (arr.find(a => String(a.zoomMeetingId) === String(entry.zoomMeetingId))) return;
        arr.unshift(entry);
        savePendingMeetings(arr);
    };

    const removePendingMeetingByZoomId = (zoomMeetingId) => {
        const arr = loadPendingMeetings();
        const remaining = arr.filter(p => String(p.zoomMeetingId) !== String(zoomMeetingId));
        if (remaining.length !== arr.length) savePendingMeetings(remaining);
    };

    const applyPendingMeetings = (currentMeetingsByBatch, currentVideos) => {
        const pendings = loadPendingMeetings();
        if (!pendings || pendings.length === 0) return currentMeetingsByBatch;

        const copy = { ...currentMeetingsByBatch };

        pendings.forEach(p => {
            const batchId = p.batchId;
            const meetingExists = (copy[batchId] || []).some(m => String(m.zoomMeetingId) === String(p.zoomMeetingId));
            if (!meetingExists) {
                const placeholderMeeting = {
                    id: `pending-${p.zoomMeetingId}`,
                    day: p.day || null,
                    session: p.session || null,
                    date: p.date || null,
                    time: p.time || null,
                    zoomMeetingId: p.zoomMeetingId,
                    joinUrl: p.joinUrl || null,
                    recordings: [
                        { recording_file_id: p.zoomMeetingId, status: 'processing' }
                    ]
                };
                const arr = copy[batchId] ? [...copy[batchId]] : [];
                arr.unshift(placeholderMeeting);
                copy[batchId] = arr;
            }

            // If a matching Vimeo video exists for this meeting, remove pending entry
            const matched = (currentVideos || []).some(v => {
                const name = (v.name || '').toLowerCase();
                return (p.zoomMeetingId && name.includes(String(p.zoomMeetingId)));
            });
            if (matched) removePendingMeetingByZoomId(p.zoomMeetingId);
        });

        return copy;
    };

    const loadPlaceholdersFromStorage = () => {
        try {
            const raw = localStorage.getItem(PLACEHOLDER_KEY);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to load placeholders', e);
            return [];
        }
    };

    const savePlaceholdersToStorage = (arr) => {
        try {
            localStorage.setItem(PLACEHOLDER_KEY, JSON.stringify(arr || []));
        } catch (e) {
            console.error('Failed to save placeholders', e);
        }
    };

    const addPlaceholderToStorage = (ph) => {
        const arr = loadPlaceholdersFromStorage();
        arr.unshift(ph);
        savePlaceholdersToStorage(arr);
    };

    const removePlaceholderFromStorageByMeetingId = (meetingZoomId) => {
        const arr = loadPlaceholdersFromStorage();
        const remaining = arr.filter(p => String(p.meetingZoomId) !== String(meetingZoomId));
        if (remaining.length !== arr.length) savePlaceholdersToStorage(remaining);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const [error, setError] = useState(null);
    const [videoError, setVideoError] = useState(null);

    const attachZoomMeetingIdToVideos = (videos, meetingsByBatch) => {
        const allMeetings = Object.values(meetingsByBatch || {}).flat();

        return (videos || []).map(video => {
            const name = (video.name || "").toLowerCase();

            // Extract Day & Session from video name
            const dayMatch = name.match(/day\s*(\d+)/i);
            const sessionMatch = name.match(/session\s*(\d+)/i);

            const day = dayMatch ? parseInt(dayMatch[1]) : null;
            const session = sessionMatch ? parseInt(sessionMatch[1]) : null;

            const matchedMeeting = allMeetings.find(
                m => m.day === day && m.session === session
            );

            return {
                ...video,
                zoomMeetingId: matchedMeeting?.zoomMeetingId || null
            };
        });
    };

    const fetchData = async () => {
        setError(null);
        setVideoError(null);

        // Fetch Batches
        try {
            const batchRes = await getBatches();
            setBatches(batchRes.data);
            // Fetch meetings for each batch
            try {
                const list = batchRes.data || [];
                const responses = await Promise.all(list.map(b => getBatchMeetings(b.id).catch(err => ({ data: [] }))));
                const byBatch = {};
                list.forEach((b, i) => {
                    byBatch[b.id] = responses[i]?.data || [];
                });
                setMeetingsByBatch(byBatch);
            } catch (err) {
                console.error('Failed to load meetings for batches', err);
            }
        } catch (err) {
            console.error("Error fetching batches", err);
            setError("Failed to load batches. Check backend connection.");
        }

        // Fetch Videos
        try {
            const videoRes = await getVimeoVideos();
            const fetched = videoRes.data || [];
        
            console.log("Fetched videos:", fetched);
        
            // ❌ DO NOT map here
            setVideos(fetched);
        
            setMeetingsByBatch(prev =>
                applyPendingMeetings(prev, fetched)
            );
        
        } catch (err) {
            console.error("Error fetching videos", err);
        }
    };

    // 🔥 Auto attach zoomMeetingId whenever meetings load
    useEffect(() => {
        if (!meetingsByBatch || Object.keys(meetingsByBatch).length === 0) return;

        setVideos(prev =>
            attachZoomMeetingIdToVideos(prev, meetingsByBatch)
        );

    }, [meetingsByBatch]);

    // Recording helper functions removed — recordings are not shown in meetings view.

    // Poll for processing recordings / placeholder videos and refresh until they become available
    useEffect(() => {
        let interval = null;

        const hasPlaceholders = () => {
            const videoPlaceholders = (videos || []).some(v => v && v.placeholder);
            const meetingPlaceholders = Object.values(meetingsByBatch || {}).some(arr =>
                (arr || []).some(m => (m.recordings || []).some(r => r.status === 'processing' || r.status === 'waiting'))
            );
            return videoPlaceholders || meetingPlaceholders;
        };

        const refreshProcessing = async () => {
            try {
                // refresh Vimeo list
                const vres = await getVimeoVideos();
                const fetched = vres.data || [];

                // Keep any placeholders that don't yet match a fetched video
                const placeholders = (videos || []).filter(v => v && v.placeholder).filter(ph => {
                    const match = fetched.some(f => {
                        const name = (f.name || '').toLowerCase();
                        return (ph.name || '').toLowerCase().includes(name) || name.includes((ph.name || '').toLowerCase()) || (ph.name || '').toLowerCase().includes((f.name || '').toLowerCase());
                    });
                    return !match;
                });

                setVideos([...placeholders, ...fetched]);

                // refresh meetings for batches that have placeholders
                const batchIds = Object.keys(meetingsByBatch || {}).filter(bId => {
                    const arr = meetingsByBatch[bId] || [];
                    return arr.some(m => (m.recordings || []).some(r => r.status === 'processing' || r.status === 'waiting'));
                });

                await Promise.all(batchIds.map(id => getBatchMeetings(id).then(res => {
                    setMeetingsByBatch(prev => ({ ...prev, [id]: res.data || [] }));
                }).catch(() => {})));

            } catch (err) {
                console.error('Polling refresh failed', err);
            }
        };

        if (hasPlaceholders()) {
            // poll every 20 seconds
            interval = setInterval(() => {
                refreshProcessing();
            }, 20000);
            // initial immediate refresh
            refreshProcessing();
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [videos, meetingsByBatch]);

    const handleCreateMeetingClick = (batchId) => {
        setSelectedBatchId(batchId);
        setShowCreateModal(true);
    };

    const handleDeleteMeetingClick = (batchId) => {
        setSelectedBatchId(batchId);
        setShowDeleteModal(true);
    };

    const handleCreateMeeting = async (batchId, day, session, date, time) => {
        try {
            const res = await createZoomMeeting(batchId, day, session, date, time);
            setShowCreateModal(false);

            // Optimistically add the new meeting to UI with a placeholder recording
            const newMeeting = {
                id: res.id,
                day,
                session,
                date,
                time,
                zoomMeetingId: res.zoomMeetingId,
                joinUrl: res.joinUrl,
                recordings: [
                    {
                        recording_file_id: `${res.zoomMeetingId}`,
                        status: 'processing',
                    }
                ]
            };

            setMeetingsByBatch(prev => {
                const copy = { ...prev };
                const arr = copy[batchId] ? [...copy[batchId]] : [];
                arr.unshift(newMeeting);
                copy[batchId] = arr;
                // persist pending meeting so placeholder survives refresh
                try {
                    const ts = new Date().toISOString();
                    addPendingMeeting({ batchId, zoomMeetingId: res.zoomMeetingId, day, session, date, time, joinUrl: res.joinUrl, createdAt: ts });
                } catch (e) {
                    console.error('Failed to persist pending meeting', e);
                }
                return copy;
            });

            // Also add a placeholder to Class Recordings so UI shows a card immediately
            try {
                const batchObj = batches.find(b => b.id === batchId) || { name: 'Batch' };
                const ts = new Date().toISOString().replace('T', ' ').split('.')[0];
                    const placeholderVideo = {
                        id: null,
                        meetingZoomId: res.zoomMeetingId,
                        name: `${batchObj.name} - Day ${day} - Session ${session} ${ts}`,
                        description: 'Processing - will appear in Vimeo library when available',
                        placeholder: true,
                        createdAt: ts,
                    };
                    setVideos(prev => [placeholderVideo, ...(prev || [])]);
                    addPlaceholderToStorage(placeholderVideo);
            } catch (e) {
                console.error('Failed to add placeholder video', e);
            }

            // Refresh meetings for this batch in background to pick up real recordings when available
            getBatchMeetings(batchId).then(updated => {
                setMeetingsByBatch(prev => ({ ...prev, [batchId]: updated.data || [] }));
            }).catch(e => console.error('Failed to refresh meetings after create', e));
        } catch (error) {
            console.error("Failed to create meeting", error);
            alert("Failed to create meeting");
        }
    };

    // New: toggle meeting list visibility and lazy-load meetings
    const toggleViewMeetings = async (batchId) => {
        const currently = !!expandedBatches[batchId];
        if (currently) {
            setExpandedBatches(prev => ({ ...prev, [batchId]: false }));
            return;
        }
        // open -> ensure meetings are loaded
        try {
            const res = await getBatchMeetings(batchId);
            setMeetingsByBatch(prev => ({ ...prev, [batchId]: res.data || [] }));
            setExpandedBatches(prev => ({ ...prev, [batchId]: true }));
        } catch (err) {
            console.error('Failed to load meetings for batch', err);
            alert('Failed to load meetings for batch');
        }
    };

    // New: delete batch
    const handleDeleteBatch = async (batchId) => {
        if (!window.confirm('Are you sure you want to delete this batch?')) return;
        try {
            await deleteBatch(batchId);
            setBatches(prev => prev.filter(b => b.id !== batchId));
            setMeetingsByBatch(prev => {
                const copy = { ...prev };
                delete copy[batchId];
                return copy;
            });
            setExpandedBatches(prev => {
                const copy = { ...prev };
                delete copy[batchId];
                return copy;
            });
        } catch (err) {
            console.error('Failed to delete batch', err);
            alert('Failed to delete batch: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteVideo = async (videoId) => {
        // Deprecated: use DeleteVimeoModal flow instead
        if (!window.confirm("Are you sure you want to delete this Vimeo video?")) return;
        try {
            await deleteVimeoVideo(videoId);
            setVideos(videos.filter(v => v.id !== videoId));
        } catch (error) {
            console.error("Failed to delete Vimeo video", error);
            alert("Failed to delete Vimeo video");
        }
    };

    // Vimeo deletion flow: attempt to delete Zoom recording by name first,
    // only delete Vimeo if Zoom deletion succeeds.
    const [showDeleteVimeoModal, setShowDeleteVimeoModal] = useState(false);
    const [selectedVideoForDelete, setSelectedVideoForDelete] = useState(null);

    const requestDeleteVimeo = (video) => {
        setSelectedVideoForDelete(video);
        setShowDeleteVimeoModal(true);
    };

    const performDeleteVimeoWithZoomCheck = async (video) => {
        // Try to delete Zoom recording by known Zoom id fields first. If that fails, surface error and stop.
        const zoomId = video.zoomMeetingId || video.meetingZoomId || (video.recordings && video.recordings[0] && video.recordings[0].recording_file_id) || video.recording_file_id;
        if (!zoomId) {
            throw new Error('Zoom meeting id missing on selected video.');
        }

        try {
            // Attempt to delete Zoom recording that matches the video zoom id.
            await deleteZoomRecording(zoomId);
        } catch (err) {
            // If zoom deletion fails, do not proceed with Vimeo deletion.
            console.error('Zoom deletion failed, cannot delete Vimeo', err);
            throw new Error('Zoom deletion failed. Please delete the recording in Zoom first.');
        }

        // If Zoom deletion succeeded, proceed to delete Vimeo video.
        try {
            if (!video.id) throw new Error('Vimeo video id not available');
            await deleteVimeoVideo(video.id);
            setVideos(prev => (prev || []).filter(v => v.id !== video.id));
            setShowDeleteVimeoModal(false);
            setSelectedVideoForDelete(null);
        } catch (err) {
            console.error('Failed to delete Vimeo after Zoom deletion', err);
            throw new Error('Failed to delete Vimeo video after Zoom deletion.');
        }
    };

    // Placeholder for Zoom delete logic
    const handleDeleteZoom = async (meetingId) => {
        // keep existing behavior for backward compatibility: delete recordings only
        if (!window.confirm(`Are you sure you want to delete Zoom recordings for "${meetingId}"?`)) return;
        try {
            await deleteZoomRecording(meetingId);
            alert("Zoom recording deletion initiated. (Video in list will remain)");
        } catch (error) {
            console.error("Failed to delete Zoom video", error);
            alert("Failed to delete Zoom video: " + (error.response?.data?.error || error.message));
        }
    };

    // Delete Zoom meeting directly using zoomMeetingId
    const handleDeleteMeetingBySessionId = async (zoomMeetingId) => {
        console.log("Current batches sessions:", meetingsByBatch);

        if (!zoomMeetingId) {
            alert("Zoom Meeting ID missing");
            return;
        }

        // Find meeting (optional validation)
        let meetingFound = null;

        Object.values(meetingsByBatch || {}).forEach(batchMeetings => {
            const found = (batchMeetings || []).find(
                m => String(m.zoomMeetingId) === String(zoomMeetingId)
            );
            if (found) meetingFound = found;
        });

        if (!meetingFound) {
            alert("Meeting not found");
            return;
        }

        if (!window.confirm(
            `Are you sure you want to delete Zoom meeting ${zoomMeetingId}?`
        )) return;

        try {
            setProcessingMessage("Deleting meeting...");

            // 🔴 Delete from backend + Zoom
            await deleteZoomRecording(zoomMeetingId);

            // 🟢 Remove from meetingsByBatch state
            setMeetingsByBatch(prev => {
                const copy = {};
                Object.keys(prev || {}).forEach(bid => {
                    copy[bid] = (prev[bid] || []).filter(
                        m => String(m.zoomMeetingId) !== String(zoomMeetingId)
                    );
                });
                return copy;
            });

            // 🟢 Remove pending/placeholder data
            try { removePendingMeetingByZoomId(zoomMeetingId); } catch (e) { console.error(e); }
            try { removePlaceholderFromStorageByMeetingId(zoomMeetingId); } catch (e) { console.error(e); }

            // 🟢 Remove placeholder videos
            setVideos(prev =>
                (prev || []).filter(
                    v => !(v?.placeholder &&
                        String(v.meetingZoomId) === String(zoomMeetingId))
                )
            );

            alert("Meeting deleted successfully.");
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Failed to delete meeting: " +
                (err.response?.data?.error || err.message));
        } finally {
            setProcessingMessage(null);
        }
    };



    // No embedded player: Play buttons open Vimeo in a new tab when available

    return (
        <div className="container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>LMS Dashboard</h1>
                <Link to="/create-batch" className="btn btn-primary">Create New Batch</Link>
            </div>

            {error && <div className="alert alert-danger" style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}

            <section className="mb-5">
                <h2>Batches</h2>
                <div className="batch-grid">
                    {batches.map(batch => (
                        <div key={batch.id} className="card">
                            <h3>{batch.name}</h3>
                            <p><strong>Code:</strong> {batch.code}</p>
                            <p><strong>Client:</strong> {batch.client}</p>
                            <div className="mt-3 d-flex gap-2">
                                <button className="btn btn-success" onClick={() => handleCreateMeetingClick(batch.id)}>
                                    Create Zoom Meeting
                                </button>
                                <button className="btn btn-danger" onClick={() => handleDeleteMeetingClick(batch.id)}>
                                    Delete Zoom Meeting
                                </button>

                                {/* New buttons: View meetings & Delete batch */}
                                <button
                                    className="btn"
                                    style={{ backgroundColor: '#0d6efd', color: '#fff', borderColor: '#0d6efd' }}
                                    onClick={() => toggleViewMeetings(batch.id)}
                                >
                                    {expandedBatches[batch.id] ? 'Hide Meetings' : 'View Meetings'}
                                </button>

                                <button
                                    className="btn"
                                    style={{ backgroundColor: '#dc3545', color: '#fff', borderColor: '#dc3545' }}
                                    onClick={() => { setSelectedBatchId(batch.id); setSelectedBatch(batch); setShowDeleteBatchModal(true); }}
                                >
                                    Delete Batch
                                </button>
                            </div>

                            <div className="mt-3">
                                {expandedBatches[batch.id] ? (
                                    <>
                                        <h6>Meetings</h6>
                                        {(!meetingsByBatch[batch.id] || meetingsByBatch[batch.id].length === 0) ? (
                                            <p className="text-muted">No meetings for this batch.</p>
                                        ) : (
                                            <ul className="list-group">
                                                {meetingsByBatch[batch.id].map(m => (
                                                    <li key={m.id || m._id || `${m.day}-${m.session}-${m.zoomMeetingId}`} className="list-group-item">
                                                        <div><strong>Day:</strong> {m.day ?? 'N/A'} &nbsp; <strong>Session:</strong> {m.session ?? 'N/A'}</div>
                                                        <div><strong>Zoom ID:</strong> {m.zoomMeetingId ?? 'N/A'}</div>
                                                        <div><strong>Date:</strong> {m.date ?? 'N/A'} &nbsp; <strong>Time:</strong> {m.time ?? 'N/A'}</div>
                                                        {m.joinUrl && <div><a href={m.joinUrl} target="_blank" rel="noreferrer">Join Link</a></div>}
                                                        {/* Recordings hidden in meetings view per user request */}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-muted">.</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {batches.length === 0 && <p>No batches found.</p>}
                </div>
            </section>
            {/* The meetings and videos sections are now inside the DeleteMeetingModal, so they only show when user clicks "Delete Zoom Meeting" for a batch. This is because the user said they want to delete a meeting, so it's more relevant to show recordings there and allow deletion from that context. The main home page is now more focused on batch-level actions and viewing meetings, while the delete modal is focused on managing recordings for that batch's meetings. */}

            {/* Modals */}
            <section>
                <h2>Class Recordings</h2>
                {processingMessage && (
                    <div className="alert alert-info" style={{ marginBottom: '10px' }}>{processingMessage}</div>
                )}
                {videoError && <div className="alert alert-warning" style={{ color: 'orange', marginBottom: '10px' }}>{videoError}</div>}
                <div className="video-grid">
                    {videos.map(video => (
                        <div key={video.id} className="card video-card">
                            <h4>{video.name}</h4>
                            <p>{video.description}</p>

                            {/* Play opens embedded player inside this card when available; otherwise show processing */}
                            {embeddedPlayer.vimeoId === video.id && embeddedPlayer.kind === 'video' ? (
                                <div className="mb-3">
                                    <VimeoPlayer videoId={video.id} />
                                    <button className="btn btn-secondary mt-2" onClick={() => setEmbeddedPlayer({ vimeoId: null, kind: null, id: null })}>Close Player</button>
                                </div>
                            ) : (
                                <button
                                    className="btn btn-primary mb-3"
                                    onClick={() => {
                                        if (!video.id) {
                                            setProcessingMessage('Processing - video not yet available in Vimeo.');
                                            setTimeout(() => setProcessingMessage(null), 3000);
                                            return;
                                        }
                                        setEmbeddedPlayer({ vimeoId: video.id, kind: 'video', id: video.id });
                                    }}
                                >
                                    {video.id ? 'Play Video' : 'Processing...'}
                                </button>
                            )}

                            <div className="d-flex gap-2">
                                <button className="btn btn-danger" disabled={!video.id} onClick={() => {
                                    if (!video.id) {
                                        setProcessingMessage('Vimeo video not yet available to delete.');
                                        setTimeout(() => setProcessingMessage(null), 2500);
                                        return;
                                    }
                                    // open modal which will check Zoom deletion first then delete Vimeo
                                    requestDeleteVimeo(video);
                                }}>
                                    Delete Vimeo
                                </button>
                                <button className="btn btn-danger" onClick={() => handleDeleteMeetingBySessionId(video.zoomMeetingId)}>
                                    Delete Zoom Meeting
                                </button>
                            </div>
                        </div>
                    ))}
                    {videos.length === 0 && <p>No recordings found.</p>}
                </div>
            </section>

            {/* Modals */}
            {showCreateModal && (
                <CreateMeetingModal
                    batchId={selectedBatchId}
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateMeeting}
                />
            )}



            {showDeleteModal && (
                <DeleteMeetingModal
                    batchId={selectedBatchId}
                    onClose={() => setShowDeleteModal(false)}
                    onDeleted={(meetingId, zoomMeetingId) => {
                        // remove meeting from UI
                        setMeetingsByBatch(prev => {
                            const copy = { ...prev };
                            if (!copy[selectedBatchId]) return prev;
                            copy[selectedBatchId] = (copy[selectedBatchId] || []).filter(m => String(m.id) !== String(meetingId) && String(m.zoomMeetingId) !== String(zoomMeetingId));
                            return copy;
                        });

                        // Remove pending meeting storage entry (if any)
                        try { removePendingMeetingByZoomId(zoomMeetingId); } catch (e) { console.error(e); }

                        // If there is a placeholder class-recording card for this meeting and
                        // there's no real Vimeo video that matches this zoomMeetingId, remove that placeholder card.
                        const hasVimeo = videos.some(v => {
                            const name = (v.name || '').toLowerCase();
                            return zoomMeetingId && name.includes(String(zoomMeetingId));
                        });
                        if (!hasVimeo) {
                            setVideos(prev => (prev || []).filter(v => !(v && v.placeholder && String(v.meetingZoomId) === String(zoomMeetingId))));
                            try { removePlaceholderFromStorageByMeetingId(zoomMeetingId); } catch (e) { console.error(e); }
                        }

                    }}
                />
            )}

            {showDeleteVimeoModal && (
                <DeleteVimeoModal
                    show={showDeleteVimeoModal}
                    onClose={() => { setShowDeleteVimeoModal(false); setSelectedVideoForDelete(null); }}
                    video={selectedVideoForDelete}
                    onDeleteAttempt={performDeleteVimeoWithZoomCheck}
                />
            )}

            {showDeleteBatchModal && (
                <DeleteBatchModal
                    batchId={selectedBatchId}
                    batch={selectedBatch}
                    onClose={() => setShowDeleteBatchModal(false)}
                    onDeleted={(id) => {
                        // Only remove the batch and its meetings state.
                        // Do NOT remove videos/placeholders/pending meetings so recordings remain.
                        setBatches(prev => prev.filter(b => b.id !== id));
                        setMeetingsByBatch(prev => {
                            const copy = { ...prev };
                            delete copy[id];
                            return copy;
                        });
                        setExpandedBatches(prev => {
                            const copy = { ...prev };
                            delete copy[id];
                            return copy;
                        });
                        setShowDeleteBatchModal(false);
                    }}
                />
            )}

            {/* No embedded Vimeo modal — Play opens Vimeo in new tab */}

        </div>
    );
};

export default Home;