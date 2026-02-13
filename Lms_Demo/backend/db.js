const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'lms.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

db.serialize(() => {

    /* =========================
       BATCHES TABLE
    ========================= */
    db.run(`
        CREATE TABLE IF NOT EXISTS batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            code TEXT,
            client TEXT,
            mode TEXT,
            trainer TEXT,
            admin TEXT,
            location TEXT,
            timing TEXT
        )
    `);


    /* =========================
       MEETINGS TABLE
    ========================= */
    db.run(`
        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batchId INTEGER,
            day INTEGER,
            session INTEGER,
            zoomMeetingId TEXT,
            zoomMeetingUUID TEXT,
            joinUrl TEXT,
            recording_file_id TEXT,
            recording_file_uuid TEXT,
            recording_status TEXT,
            FOREIGN KEY(batchId) REFERENCES batches(id)
        )
    `);


    /* =========================
       RECORDINGS TABLE
    ========================= */
    db.run(`
        CREATE TABLE IF NOT EXISTS recordings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meetingLocalId INTEGER,
            zoomMeetingId TEXT,
            zoomMeetingUUID TEXT,
            recording_file_id TEXT,
            recording_file_uuid TEXT,
            status TEXT,
            FOREIGN KEY(meetingLocalId) REFERENCES meetings(id)
        )
    `);


    /* =========================
       SAFE COLUMN MIGRATION
       (For old DBs)
    ========================= */
    db.all("PRAGMA table_info(meetings)", (err, rows) => {

        if (err) {
            console.error('Error reading meetings table info:', err);
            return;
        }

        const columns = rows.map(r => r.name);

        if (!columns.includes('zoomMeetingUUID')) {
            db.run('ALTER TABLE meetings ADD COLUMN zoomMeetingUUID TEXT');
            console.log('Added zoomMeetingUUID column');
        }

        if (!columns.includes('recording_file_id')) {
            db.run('ALTER TABLE meetings ADD COLUMN recording_file_id TEXT');
            console.log('Added recording_file_id column');
        }

        if (!columns.includes('recording_file_uuid')) {
            db.run('ALTER TABLE meetings ADD COLUMN recording_file_uuid TEXT');
            console.log('Added recording_file_uuid column');
        }

        if (!columns.includes('recording_status')) {
            db.run('ALTER TABLE meetings ADD COLUMN recording_status TEXT');
            console.log('Added recording_status column');
        }
    });

    // Ensure recordings table has recording_file_uuid column for older DBs
    db.all("PRAGMA table_info(recordings)", (rErr, rRows) => {
        if (rErr) {
            console.error('Error reading recordings table info:', rErr);
            return;
        }

        const rColumns = rRows.map(r => r.name);
        if (!rColumns.includes('recording_file_uuid')) {
            db.run('ALTER TABLE recordings ADD COLUMN recording_file_uuid TEXT');
            console.log('Added recording_file_uuid column to recordings');
        }

        if (!rColumns.includes('zoomMeetingUUID')) {
            db.run('ALTER TABLE recordings ADD COLUMN zoomMeetingUUID TEXT');
            console.log('Added zoomMeetingUUID column to recordings');
        }
    });

});

module.exports = db;
