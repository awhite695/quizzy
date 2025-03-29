import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { socket } from '../utils/socket';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Scoreboard = ({ roomCode }) => {
  const [contestants, setContestants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomCode) return;
    
    // Fetch contestants for the room
    const fetchContestants = async () => {
      try {
        const response = await axios.get(`${API_URL}/rooms/${roomCode}`);
        if (response.data.success) {
          setContestants(response.data.session.contestants || []);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching contestants:', err);
        setError('Failed to load scoreboard');
        setLoading(false);
      }
    };
    
    fetchContestants();
    
    // Listen for score updates
    socket.on('score-updated', (data) => {
      setContestants(prev => {
        return prev.map(contestant => {
          if (contestant._id === data.contestantId) {
            return { ...contestant, currentScore: data.newScore };
          }
          return contestant;
        });
      });
    });
    
    // Listen for new contestants
    socket.on('contestant-joined', (data) => {
      setContestants(prev => [...prev, data.contestant]);
    });
    
    return () => {
      socket.off('score-updated');
      socket.off('contestant-joined');
    };
  }, [roomCode]);

  if (loading) {
    return <div className="text-center p-4">Loading scoreboard...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-600">{error}</div>;
  }

  // Sort contestants by score (highest first)
  const sortedContestants = [...contestants].sort((a, b) => b.currentScore - a.currentScore);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-xl font-bold mb-4">Scoreboard</h3>
      
      {sortedContestants.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No contestants yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 text-left">Rank</th>
                <th className="py-2 px-4 text-left">Name</th>
                <th className="py-2 px-4 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {sortedContestants.map((contestant, index) => (
                <tr key={contestant._id} className="border-t">
                  <td className="py-2 px-4">{index + 1}</td>
                  <td className="py-2 px-4 font-medium">{contestant.name}</td>
                  <td className="py-2 px-4 text-right font-bold">
                    ${contestant.currentScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Scoreboard; 