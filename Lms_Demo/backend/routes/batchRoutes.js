const express = require('express');
const router = express.Router();
const db = require('../db');
const vimeoService = require('../services/vimeoService');

// Get all batches
router.get('/', (req, res) => {
    db.all('SELECT * FROM batches ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Create a new batch
router.post('/', (req, res) => {
    const { name, code, client, mode, trainer, admin, location, timing } = req.body;
    if (!name || !code) {
        res.status(400).json({ error: 'Name and Code are required' });
        return;
    }

    const sql = `INSERT INTO batches (name, code, client, mode, trainer, admin, location, timing) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, code, client, mode, trainer, admin, location, timing];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            id: this.lastID,
            name,
            code,
            client,
            mode,
            trainer,
            admin,
            location,
            timing
        });
    });
});

// Get meetings for a specific batch (optional but useful)
router.get('/:batchId/meetings', (req, res) => {
    const { batchId } = req.params;
    db.all('SELECT * FROM meetings WHERE batchId = ?', [batchId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // For each meeting, fetch associated recordings
        const mapPromises = rows.map(m => {
            return new Promise((resolve) => {
                db.all('SELECT * FROM recordings WHERE meetingLocalId = ? OR zoomMeetingId = ?', [m.id, m.zoomMeetingId], (rErr, recs) => {
                    if (rErr) {
                        console.error('Failed to fetch recordings for meeting', m.id, rErr);
                        m.recordings = [];
                        resolve(m);
                    } else {
                        m.recordings = recs || [];
                        resolve(m);
                    }
                });
            });
        });

        Promise.all(mapPromises).then(results => res.json(results));
    });
});

// Delete a batch and its associated meetings (do NOT delete recordings)
router.delete('/:id', (req, res) => {
    const batchId = req.params.id;

    db.get('SELECT id, name, code FROM batches WHERE id = ?', [batchId], (err, batchRow) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!batchRow) return res.status(404).json({ error: 'Batch not found' });

        // Attempt to delete Vimeo videos that appear to belong to this batch
        (async () => {
            const deletedVideos = [];
            const failedVideos = [];
            try {
                const videos = await vimeoService.getVimeoVideos();
                const nameLower = (batchRow.name || '').toLowerCase();
                const codeLower = (batchRow.code || '').toLowerCase();

                const matches = (videos || []).filter(v => {
                    const combined = `${v.name || ''} ${v.description || ''}`.toLowerCase();
                    return (nameLower && combined.includes(nameLower)) || (codeLower && combined.includes(codeLower));
                });

                for (const v of matches) {
                    const vid = (v.uri || '').split('/').pop();
                    try {
                        await vimeoService.deleteVimeoVideo(vid);
                        deletedVideos.push(vid);
                    } catch (dErr) {
                        console.error('Failed to delete Vimeo video for batch', batchId, vid, dErr.message || dErr);
                        failedVideos.push({ id: vid, error: dErr.message || String(dErr) });
                    }
                }
            } catch (fetchErr) {
                console.error('Failed to fetch Vimeo videos for batch deletion', fetchErr.message || fetchErr);
            }

            // Proceed to delete meetings and batch in DB (transactional)
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) return res.status(500).json({ error: err.message });

                db.run('DELETE FROM meetings WHERE batchId = ?', [batchId], function (err) {
                    if (err) return db.run('ROLLBACK', () => res.status(500).json({ error: err.message }));

                    db.run('DELETE FROM batches WHERE id = ?', [batchId], function (err) {
                        if (err) return db.run('ROLLBACK', () => res.status(500).json({ error: err.message }));

                        const deleted = this.changes;
                        db.run('COMMIT', (err) => {
                            if (err) return res.status(500).json({ error: err.message });
                            return res.json({ success: true, deleted, vimeoDeleted: deletedVideos, vimeoFailed: failedVideos });
                        });
                    });
                });
            });
        })();
    });
});

module.exports = router;
