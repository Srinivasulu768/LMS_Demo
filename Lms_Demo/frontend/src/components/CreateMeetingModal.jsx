import React, { useState } from 'react';

const CreateMeetingModal = ({ batchId, onClose, onCreate }) => {
    const [day, setDay] = useState(1);
    const [session, setSession] = useState(1);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onCreate(batchId, day, session, date, time);
        setLoading(false);
    };

    return (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Create Zoom Meeting</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label>Day (1-40)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="40"
                                    className="form-control"
                                    value={day}
                                    onChange={(e) => setDay(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label>Session (1-5)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    className="form-control"
                                    value={session}
                                    onChange={(e) => setSession(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label>Date</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label>Time</label>
                                <input
                                    type="time"
                                    className="form-control"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Meeting'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateMeetingModal;
