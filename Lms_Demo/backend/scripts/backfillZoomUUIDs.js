const db = require('../db');
const zoomService = require('../services/zoomService');
const util = require('util');

const dbAll = util.promisify(db.all.bind(db));
const dbRun = util.promisify(db.run.bind(db));

const normalize = (id) => id ? String(id).replace(/\.0$/, '') : id;

async function backfill() {
    try {
        const rows = await dbAll("SELECT DISTINCT zoomMeetingId FROM recordings WHERE zoomMeetingUUID IS NULL AND zoomMeetingId IS NOT NULL");

        for (const r of rows) {
            const rawId = r.zoomMeetingId;
            const meetingId = normalize(rawId);
            if (!meetingId) continue;

            console.log('Looking up Zoom meeting recordings for', meetingId);

            try {
                const data = await zoomService.getMeetingRecordings(meetingId);
                const uuid = data.uuid || data.meeting_uuid || null;

                if (!uuid) {
                    console.warn('No uuid returned for meeting', meetingId);
                    continue;
                }

                // Update meetings table
                await dbRun('UPDATE meetings SET zoomMeetingUUID = ? WHERE zoomMeetingId = ? OR zoomMeetingId = ?', [uuid, rawId, meetingId]);

                // Update recordings table
                await dbRun('UPDATE recordings SET zoomMeetingUUID = ? WHERE zoomMeetingId = ? OR zoomMeetingId = ?', [uuid, rawId, meetingId]);

                console.log(`Updated meeting ${meetingId} -> uuid ${uuid}`);

            } catch (err) {
                console.error('Zoom API lookup failed for', meetingId, err.message || err);
            }
        }

        console.log('Backfill complete');
        process.exit(0);

    } catch (err) {
        console.error('Backfill script error', err);
        process.exit(1);
    }
}

if (require.main === module) {
    backfill();
}

module.exports = backfill;
