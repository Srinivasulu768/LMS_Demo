const express = require('express');
const router = express.Router();
const db = require('../db');
const validateZoomSignature = require('../middleware/zoomSignatureValidator');

// Zoom webhook receiver
router.post('/', validateZoomSignature, async (req, res) => {
    try {
        const event = req.body.event;
        const payload = req.body.payload || {};
        const obj = payload.object || {};

        // Log event with response data
        console.log('Zoom webhook event received:', { event, payload: JSON.stringify(obj) });

        // Recording events (including explicit stopped event)
        if (event && obj && (event.startsWith('recording.') || event === 'recording.started' || event === 'recording.completed' || event === 'recording.stopped')) {
                const meetingZoomId = obj.id || obj.meeting_id || obj.uuid;
                const meetingUuid = (payload && payload.uuid) || obj.uuid || obj.meeting_uuid || null;
                const recordingFiles = obj.recording_files || [];

                if (meetingZoomId && recordingFiles.length) {
                    // log recording stopped event with meeting id and recording data
                    if (event === 'recording.stopped') {
                        console.log('Recording stopped for meeting:', meetingZoomId, 'recordingFiles:', recordingFiles);
                    }

                    // iterate through recording files and insert a row for each
                    const normalized = meetingZoomId ? String(meetingZoomId).replace(/\.0$/, '') : null;
                    recordingFiles.forEach(file => {
                        const fileId = file.id || file.file_id || file.recording_id || null;
                        const fileUuid = file.uuid || file.recording_uuid || file.recording_id || file.file_id || file.id || null;
                        const status = event;
                        if (!fileId) return;

                        // log each recording file with meeting id
                        console.log('Recording file received for meeting:', meetingZoomId, { fileId, status, file });

                        // Find local meeting id if present (match by meeting id or stored UUID)
                        db.get('SELECT id FROM meetings WHERE zoomMeetingId = ? OR zoomMeetingId = ? OR zoomMeetingUUID = ?', [meetingZoomId, normalized, meetingUuid], (err, row) => {
                            if (err) return console.error('DB lookup error', err);
                            const meetingLocalId = row ? row.id : null;

                            const insertRecording = (mId) => {
                                db.run(
                                    'INSERT INTO recordings(meetingLocalId, zoomMeetingId, zoomMeetingUUID, recording_file_id, recording_file_uuid, status) VALUES(?,?,?,?,?,?)',
                                    [mId, meetingZoomId, meetingUuid, fileId, fileUuid, status],
                                    function (insertErr) {
                                        if (insertErr) return console.error('Failed to insert recording', insertErr);
                                    }
                                );
                            };

                            const updateMeetingRecording = (mId) => {
                                if (meetingUuid) {
                                    db.run(
                                        'UPDATE meetings SET recording_file_id = ?, recording_file_uuid = ?, recording_status = ?, zoomMeetingUUID = ? WHERE id = ?',
                                        [fileId, fileUuid, status, meetingUuid, mId],
                                        function (uErr) {
                                            if (uErr) console.error('Failed to update meeting recording fields', uErr);
                                        }
                                    );
                                } else {
                                    db.run(
                                        'UPDATE meetings SET recording_file_id = ?, recording_file_uuid = ?, recording_status = ? WHERE id = ?',
                                        [fileId, fileUuid, status, mId],
                                        function (uErr) {
                                            if (uErr) console.error('Failed to update meeting recording fields', uErr);
                                        }
                                    );
                                }
                            };

                            if (meetingLocalId) {
                                // store recording and update meeting
                                insertRecording(meetingLocalId);
                                updateMeetingRecording(meetingLocalId);

                                // update meeting's zoomMeetingUUID if provided
                                if (meetingUuid) {
                                    db.run(
                                        'UPDATE meetings SET zoomMeetingUUID = ? WHERE id = ?',
                                        [meetingUuid, meetingLocalId],
                                        function (uErr) {
                                            if (uErr) console.error('Failed to update meeting zoomMeetingUUID', uErr);
                                        }
                                    );
                                }
                            } else {
                                // No local meeting found — create a minimal meeting record with zoomMeetingId
                                db.run(
                                    'INSERT INTO meetings(zoomMeetingId, zoomMeetingUUID, recording_file_id, recording_file_uuid, recording_status) VALUES(?,?,?,?,?)',
                                    [meetingZoomId, meetingUuid, fileId, fileUuid, status],
                                    function (insErr) {
                                        if (insErr) return console.error('Failed to insert meeting', insErr);
                                        const newMeetingId = this.lastID;
                                        insertRecording(newMeetingId);
                                    }
                                );
                            }
                        });
                    });
                }
        }

        // Respond with 200 quickly
        res.status(200).send('ok');
    } catch (err) {
        console.error('Zoom webhook error', err);
        res.status(500).send('error');
    }
});

// simple GET route to verify webhook is working
router.get('/', (res) => {
    res.send('Zoom webhook endpoint is working');
});

module.exports = router;
