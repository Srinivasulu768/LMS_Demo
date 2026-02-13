import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateBatch from './pages/CreateBatch';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-batch" element={<CreateBatch />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
