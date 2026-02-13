import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBatch } from '../api';

const CreateBatch = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState(
        {
        name: '',
        code: '',
        client: '',
        mode: 'Online',
        trainer: '',
        admin: '',
        location: '',
        timing: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createBatch(formData);
            navigate('/');
        } catch (error) {
            console.error("Failed to create batch", error);
            alert("Failed to create batch");
        }
    };

    return (
        <div className="container mt-5">
            <h2>Create New Batch</h2>
            <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
                <div className="mb-3">
                    <label>Batch Code</label>
                    <input type="text" name="code" className="form-control" onChange={handleChange} required />
                </div>
                <div className="mb-3">
                    <label>Batch Name</label>
                    <input type="text" name="name" className="form-control" onChange={handleChange} required />
                </div>
                <div className="mb-3">
                    <label>Client</label>
                    <input type="text" name="client" className="form-control" onChange={handleChange} />
                </div>
                <div className="mb-3">
                    <label>Training Mode</label>
                    <select name="mode" className="form-control" onChange={handleChange}>
                        <option value="Online">Online</option>
                        <option value="Offline">Offline</option>
                        <option value="Hybrid">Hybrid</option>
                    </select>
                </div>
                <div className="mb-3">
                    <label>Trainer</label>
                    <input type="text" name="trainer" className="form-control" onChange={handleChange} />
                </div>
                <div className="mb-3">
                    <label>Admin</label>
                    <input type="text" name="admin" className="form-control" onChange={handleChange} />
                </div>
                <div className="mb-3">
                    <label>Location</label>
                    <input type="text" name="location" className="form-control" onChange={handleChange} />
                </div>
                <div className="mb-3">
                    <label>Timing</label>
                    <input type="text" name="timing" className="form-control" onChange={handleChange} />
                </div>
                <button type="submit" className="btn btn-primary">Create Batch</button>
            </form>
        </div>
    );
};

export default CreateBatch;
