import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

/* =========================
   BATCH APIs
========================= */
export const getBatches = () =>
    api.get('/batch');

export const createBatch = (batchData) =>
    api.post('/batch', batchData);

export const deleteBatch = (batchId) =>
    api.delete(`/batch/${batchId}`);

export const getBatchMeetings = (batchId) =>
    api.get(`/batch/${batchId}/meetings`);


/* =========================
   ZOOM MEETING APIs
========================= */
export const createZoomMeeting = (batchId, day, session, date, time) =>
    api.post(`/zoom/${batchId}/${day}/${session}`, { date, time });

export const deleteZoomMeeting = (meetingId) =>
    api.delete(`/zoom/${meetingId}`);

// Delete entire Zoom meeting by Zoom meeting id (not local DB id)
export const deleteZoomMeetingByZoomId = (zoomMeetingId) =>
    api.delete(`/zoom/by-zoom/${zoomMeetingId}`);


/* =========================
   ZOOM RECORDING APIs
========================= */

// Delete all recordings for a meeting (used inside meeting view)
export const deleteZoomRecording = (meetingId) =>
    api.delete(`/zoom/recordings/${meetingId}`);




/* =========================
   VIMEO APIs
========================= */
export const getVimeoVideos = () =>
    api.get('/vimeo');

export const deleteVimeoVideo = (videoId) =>
    api.delete(`/vimeo/${videoId}`);


export default api;
