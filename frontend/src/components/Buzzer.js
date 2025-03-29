import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { socket, connectSocket, joinRoom, emitBuzz } from '../utils/socket';
import SpeechToText from './SpeechToText';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Buzzer = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [contestant, setContestant] = useState(null);
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [buzzerEnabled, setBuzzerEnabled] = useState(false);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [canAnswer, setCanAnswer] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get contestant info from localStorage
    const storedContestant = localStorage.getItem('contestant');
    
    if (!storedContestant) {
      navigate('/join');
      return;
    }
    
    const contestantData = JSON.parse(storedContestant);
    setContestant(contestantData);
    
    // Connect to socket and join room
    connectSocket();
    joinRoom(roomCode);
    
    // Fetch session data
    const fetchSessionData = async () => {
      try {
        const response = await axios.get(`${API_URL}/rooms/${roomCode}`);
        setSession(response.data.session);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to connect to game session');
        setLoading(false);
      }
    };
    
    fetchSessionData();
    
    // Socket event listeners
    socket.on('buzzer-enabled', () => {
      setBuzzerEnabled(true);
      setHasBuzzed(false);
      setCanAnswer(false);
      setAnswerResult(null);
    });
    
    socket.on('buzzer-disabled', () => {
      setBuzzerEnabled(false);
    });
    
    socket.on('buzzer-pressed', (data) => {
      setBuzzerEnabled(false);
      
      if (data.contestantId === contestantData.id) {
        setHasBuzzed(true);
        if (data.isFirstBuzz) {
          setCanAnswer(true);
        }
      }
    });
    
    socket.on('next-contestant', (data) => {
      if (data.contestantId === contestantData.id) {
        setCanAnswer(true);
      }
    });
    
    socket.on('answer-result', (data) => {
      if (data.contestantId === contestantData.id) {
        setAnswerResult(data);
      }
    });
    
    socket.on('question-updated', (data) => {
      setCurrentQuestion(data.question);
      setBuzzerEnabled(false);
      setHasBuzzed(false);
      setCanAnswer(false);
      setAnswerResult(null);
    });
    
    return () => {
      // Clean up socket listeners
      socket.off('buzzer-enabled');
      socket.off('buzzer-disabled');
      socket.off('buzzer-pressed');
      socket.off('next-contestant');
      socket.off('answer-result');
      socket.off('question-updated');
    };
  }, [roomCode, navigate]);
  
  useEffect(() => {
    // Fetch current question when session changes
    const fetchCurrentQuestion = async () => {
      if (!session) return;
      
      try {
        const response = await axios.get(`${API_URL}/rooms/${roomCode}/question`);
        if (response.data.success) {
          setCurrentQuestion(response.data.question);
        }
      } catch (err) {
        // It's okay if there's no current question yet
        console.log('No active question');
      }
    };
    
    fetchCurrentQuestion();
  }, [session, roomCode]);

  const handleBuzz = () => {
    if (!buzzerEnabled || !contestant || !session) return;
    
    emitBuzz(session._id, contestant.id);
    setHasBuzzed(true);
  };

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold">Room: {roomCode}</h2>
          <p className="text-gray-600">Playing as: {contestant?.name}</p>
        </div>
        
        {currentQuestion ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-700">
                {currentQuestion.category}
              </span>
              <span className="font-bold text-blue-700">
                ${currentQuestion.pointValue}
              </span>
            </div>
            <p className="text-lg font-medium">{currentQuestion.questionText}</p>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-lg p-4 mb-6 text-center">
            Waiting for the host to start a question...
          </div>
        )}
        
        {answerResult && (
          <div className={`mb-6 p-4 rounded-lg border ${
            answerResult.isCorrect 
              ? 'bg-green-100 border-green-300' 
              : 'bg-red-100 border-red-300'
          }`}>
            <p className="font-semibold mb-2">
              {answerResult.isCorrect 
                ? 'Correct answer!' 
                : 'Incorrect answer'}
            </p>
            <p className="text-sm">
              You said: <span className="italic">{answerResult.submittedAnswer}</span>
            </p>
            <p className="text-sm">
              Correct answer: <span className="font-medium">{answerResult.correctAnswer}</span>
            </p>
          </div>
        )}
        
        {hasBuzzed && canAnswer ? (
          <div className="text-center mb-6">
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-4">
              <p className="font-semibold text-green-800">Your turn to answer!</p>
              <p className="text-gray-700">Speak your answer now</p>
            </div>
            <SpeechToText 
              sessionId={session?._id} 
              contestantId={contestant?.id}
              questionId={currentQuestion?._id}
            />
          </div>
        ) : hasBuzzed ? (
          <div className="text-center mb-6">
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
              <p className="font-semibold text-blue-800">You've buzzed in!</p>
              <p className="text-gray-700">Waiting for your turn...</p>
            </div>
          </div>
        ) : (
          <button
            onClick={handleBuzz}
            disabled={!buzzerEnabled}
            className={`w-full py-12 rounded-full font-bold text-2xl ${
              buzzerEnabled
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg transform transition hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {buzzerEnabled ? 'BUZZ IN!' : 'Waiting...'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Buzzer; 