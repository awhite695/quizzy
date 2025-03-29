import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HostDashboard from './components/HostDashboard';
import ContestantJoin from './components/ContestantJoin';
import Buzzer from './components/Buzzer';
import Scoreboard from './components/Scoreboard';
import SpeechToText from './components/SpeechToText';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-blue-600 text-white p-4">
          <h1 className="text-2xl font-bold text-center">Trivia Game MVP</h1>
        </nav>
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            {/* Home route redirects to contestant join by default */}
            <Route path="/" element={<Navigate to="/join" replace />} />
            
            {/* Host routes */}
            <Route path="/host" element={<HostDashboard />} />
            <Route path="/host/scoreboard" element={<Scoreboard />} />
            
            {/* Contestant routes */}
            <Route path="/join" element={<ContestantJoin />} />
            <Route path="/game/:roomCode" element={<Buzzer />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 