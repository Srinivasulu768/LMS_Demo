const axios = require('axios');
const querystring = require('querystring');

// Normalize meeting id (SQLite sometimes returns 12345.0)
const normalizeMeetingId = (id) => {
    if (!id) return id;
    return String(id).replace(/\.0$/, '');
};

let zoomAccessToken = null;
let tokenExpiry = null;

/* =========================
   GET ZOOM ACCESS TOKEN
========================= */
const getZoomAccessToken = async () => {

    if (zoomAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return zoomAccessToken;
    }

    const auth = Buffer
        .from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`)
        .toString('base64');

    try {

        const response = await axios.post(
            'https://zoom.us/oauth/token',
            querystring.stringify({
                grant_type: 'account_credentials',
                account_id: process.env.ZOOM_ACCOUNT_ID
            }),
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        zoomAccessToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;

        return zoomAccessToken;

    } catch (error) {

        console.error(
            'Zoom Auth Error:',
            error.response?.data || error.message
        );

        throw new Error('Zoom authentication failed');
    }
};


/* =========================
   CREATE MEETING
========================= */
const createMeeting = async (topic, startTime) => {

    const token = await getZoomAccessToken();

    try {

        const response = await axios.post(
            `https://api.zoom.us/v2/users/me/meetings`,
            {
                topic,
                type: 2,
                start_time: startTime,
                settings: {
                    auto_recording: 'cloud',
                    host_video: true,
                    participant_video: false,
                    allow_participants_chat: false,
                    mute_upon_entry: true,
                    waiting_room: false
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;

    } catch (error) {

        console.error(
            'Create Meeting Error:',
            error.response?.data || error.message
        );

        throw error;
    }
};


/* =========================
   GET MEETING RECORDINGS
========================= */
const getMeetingRecordings = async (meetingId) => {

    const token = await getZoomAccessToken();

    const mid = normalizeMeetingId(meetingId);
    const safeId = encodeURIComponent(mid);

    try {

        const res = await axios.get(
            `https://api.zoom.us/v2/meetings/${safeId}/recordings`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        return res.data;

    } catch (err) {

        console.error(
            'Get Recordings Error:',
            err.response?.data || err.message
        );

        throw err;
    }
};

/* =========================
   DELETE  RECORDINGS
========================= */
const deleteZoomRecording = async (meetingId) => {

    try {

        if (!meetingId) {
            throw new Error('MeetingId missing');
        }

        const token = await getZoomAccessToken();

        const mid = normalizeMeetingId(meetingId);
        const safeMeetingId = encodeURIComponent(mid);

        await axios.delete(
            `https://api.zoom.us/v2/meetings/${safeMeetingId}/recordings?action=delete`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        console.log('Zoom recordings deleted for meeting:', mid);

        return true;

    } catch (error) {

        if (error.response &&
            (error.response.status === 404 ||
             error.response.status === 400)) {

            console.log('No recordings found or already deleted');
            return true;
        }

        console.error(
            'Delete Recording Error:',
            error.response?.data || error.message
        );

        throw error;
    }
};


/* =========================
   DELETE ENTIRE MEETING
========================= */
const deleteMeeting = async (meetingId) => {

    try {

        const token = await getZoomAccessToken();

        const mid = normalizeMeetingId(meetingId);
        const safeId = encodeURIComponent(mid);

        await axios.delete(
            `https://api.zoom.us/v2/meetings/${safeId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        return true;

    } catch (error) {

        if (
            error.response &&
            (error.response.status === 404 ||
             error.response.status === 400)
        ) {
            return true;
        }

        console.error(
            'Delete Meeting Error:',
            error.response?.data || error.message
        );

        throw error;
    }
};


/* =========================
   EXPORTS
========================= */
module.exports = {
    createMeeting,
    deleteMeeting,
    deleteZoomRecording,
    deleteSingleRecording: deleteZoomRecording,
    getMeetingRecordings
};
