const express = require('express');
const router = express.Router();
const db = require('../db');
const zoomService = require('../services/zoomService');

/* =========================
   CREATE MEETING
========================= */
router.post('/:batchId/:day/:session', async (req, res) => {

    const { batchId, day, session } = req.params;
    const { date, time } = req.body;

    db.get('SELECT * FROM batches WHERE id=?', [batchId], async (err, batch) => {

        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        try {

            const topic = `${batch.name} - Day ${day} - Session ${session}`;

            const startTime = (date && time)
                ? new Date(`${date}T${time}:00`).toISOString()
                : new Date().toISOString();

            const meeting = await zoomService.createMeeting(topic, startTime);

            db.run(
                `INSERT INTO meetings(batchId,day,session,zoomMeetingId,zoomMeetingUUID,joinUrl)
                 VALUES(?,?,?,?,?,?)`,
                [
                    batchId,
                    day,
                    session,
                    String(meeting.id), // store as TEXT
                    meeting.uuid || null,
                    meeting.join_url
                ],
                function (insertErr) {

                    if (insertErr) {
                        return res.status(500).json({ error: insertErr.message });
                    }

                    res.json({
                        id: this.lastID,
                        zoomMeetingId: meeting.id,
                        zoomMeetingUUID: meeting.uuid || null,
                        joinUrl: meeting.join_url
                    });
                }
            );

        } catch (error) {

            console.error("Create Meeting Route Error:", error);
            res.status(500).json({
                error: error.response?.data || error.message
            });
        }
    });
});


/* =========================
   LIST RECORDINGS
========================= */
router.get('/recordings/:meetingId', async (req, res) => {

    try {

        const meetingId = String(req.params.meetingId).replace(/\.0$/, '');

        const data = await zoomService.getMeetingRecordings(meetingId);

        res.json(data);

    } catch (err) {

        res.status(500).json({
            error: err.response?.data || err.message
        });
    }
});


/* =========================
   DELETE ALL Zoom RECORDINGS
========================= */
router.delete('/recordings/:meetingId', async (req, res) => {

    try {

        const meetingId = String(req.params.meetingId).replace(/\.0$/, '');

        if (!meetingId) {
            return res.status(400).json({
                error: 'MeetingId missing'
            });
        }

        await zoomService.deleteZoomRecording(meetingId);

        // Optional: remove from local DB recordings table
        db.run(
            'DELETE FROM recordings WHERE zoomMeetingId=?',
            [meetingId],
            (err) => {
                if (err) console.error("DB delete recordings error:", err);
            }
        );

        // Optional: clear meeting recording fields
        db.run(
            'UPDATE meetings SET recording_file_id=NULL, recording_status=NULL WHERE zoomMeetingId=?',
            [meetingId]
        );

        res.json({ success: true });

    } catch (err) {

        console.error("Delete Recording Route Error:", err);

        res.status(500).json({
            error: err.response?.data || err.message
        });
    }
});



/* =========================
   DELETE ENTIRE MEETING
========================= */
router.delete('/:id', async (req, res) => {

    const localMeetingId = req.params.id;

    db.get(
        'SELECT zoomMeetingId FROM meetings WHERE id=?',
        [localMeetingId],
        async (err, row) => {

            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (!row) {
                return res.status(404).json({ error: 'Meeting not found' });
            }

            try {

                const zoomMeetingId = String(row.zoomMeetingId).replace(/\.0$/, '');

                await zoomService.deleteMeeting(zoomMeetingId);

                db.run(
                    'DELETE FROM meetings WHERE id=?',
                    [localMeetingId],
                    (deleteErr) => {

                        if (deleteErr) {
                            return res.status(500).json({ error: deleteErr.message });
                        }

                        res.json({ success: true });
                    }
                );

            } catch (error) {

                console.error("Delete Meeting Route Error:", error);

                res.status(500).json({
                    error: error.response?.data || error.message
                });
            }
        }
    );
});


module.exports = router;
