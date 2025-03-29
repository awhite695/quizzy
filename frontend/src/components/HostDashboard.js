import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { socket, connectSocket, hostRoom, enableBuzzer } from '../utils/socket';
import Scoreboard from './Scoreboard';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const HostDashboard = () => {
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buzzerEnabled, setBuzzerEnabled] = useState(false);
  const [currentContestant, setCurrentContestant] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [contestants, setContestants] = useState([]);
  const [answerGiven, setAnswerGiven] = useState(false);
  const [debugMenuExpanded, setDebugMenuExpanded] = useState(false);
  const [importMenuExpanded, setImportMenuExpanded] = useState(false);
  const [simpleFormExpanded, setSimpleFormExpanded] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    answer: '',
    pointValue: 100,
    category: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Connect to socket
    connectSocket();
    
    // Create a new game session
    const createSession = async () => {
      try {
        setLoading(true);
        
        // Wait for socket to connect before continuing
        if (!socket.connected) {
          console.log('Waiting for socket connection...');
          // Wait for socket connection if not already connected
          await new Promise((resolve) => {
            const checkConnection = () => {
              if (socket.connected) {
                resolve();
              } else {
                setTimeout(checkConnection, 100);
              }
            };
            checkConnection();
          });
        }
        
        console.log('Socket connected, socket ID:', socket.id);
        
        // Ensure socket ID is available before creating room
        if (!socket.id) {
          throw new Error('Socket ID not available');
        }
        
        const response = await axios.post(`${API_URL}/rooms/create`, {
          hostSocketId: socket.id
        });
        
        const newSession = response.data.session;
        setSession(newSession);
        
        // Join the room as host
        hostRoom(newSession.roomCode);
        
        // Create some sample questions for testing
        await createSampleQuestions(newSession.roomCode);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to create game session');
        setLoading(false);
        console.error(err);
      }
    };

    createSession();

    // Socket event listeners
    socket.on('buzzer-pressed', (data) => {
      setBuzzerEnabled(false);
      
      // Find contestant name
      const contestant = contestants.find(c => c._id === data.contestantId);
      if (contestant) {
        setCurrentContestant({
          id: data.contestantId,
          name: contestant.name,
          timestamp: data.timestamp
        });
      }
    });
    
    socket.on('answer-result', (data) => {
      console.log('Answer result received:', data);
      setAnswerResult(data);
      setAnswerGiven(true);
      console.log('Answer given set to true');
      
      // Clear current contestant after a delay
      setTimeout(() => {
        setCurrentContestant(null);
        // Do NOT reset answerGiven here
        console.log('Current contestant cleared, answerGiven remains:', true);
      }, 5000);
    });
    
    socket.on('contestant-joined', (data) => {
      setContestants(prev => [...prev, data.contestant]);
    });
    
    socket.on('contestant-left', (data) => {
      setContestants(prev => prev.filter(c => c._id !== data.contestantId));
    });

    // Add event listener for question updates
    socket.on('question-updated', (data) => {
      console.log('Question updated:', data);
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(Math.min(data.totalQuestions, 15));
      
      // Reset states for new question
      setBuzzerEnabled(false);
      setCurrentContestant(null);
      setAnswerResult(null);
      setAnswerGiven(false);
    });

    // Add event listener for buzzer enabling/disabling
    socket.on('buzzer-enabled', () => {
      console.log('Buzzer enabled event received');
      setBuzzerEnabled(true);
    });

    socket.on('buzzer-disabled', () => {
      console.log('Buzzer disabled event received');
      setBuzzerEnabled(false);
    });

    return () => {
      // Clean up socket listeners
      socket.off('buzzer-pressed');
      socket.off('answer-result');
      socket.off('contestant-joined');
      socket.off('contestant-left');
      socket.off('question-updated');
      socket.off('buzzer-enabled');
      socket.off('buzzer-disabled');
    };
  }, []);
  
  // Create sample questions for testing
  const createSampleQuestions = async (roomCode) => {
    try {
      const questions = [
        {
          round: "jeopardy",
          category: "WORLD CAPITALS",
          question: "What is the capital of France?",
          answer: "Paris",
          point_value: "$200"
        },
        {
          round: "jeopardy",
          category: "WORLD CAPITALS",
          question: "Which country's capital is Canberra?",
          answer: "Australia",
          point_value: "$400"
        },
        {
          round: "jeopardy",
          category: "WORLD CAPITALS",
          question: "What is the capital of Bhutan?",
          answer: "Thimphu",
          point_value: "$600"
        },
        {
          round: "jeopardy",
          category: "WORLD CAPITALS",
          question: "Which country's capital is Ouagadougou?",
          answer: "Burkina Faso",
          point_value: "$800"
        },
        {
          round: "jeopardy",
          category: "WORLD CAPITALS",
          question: "What is the capital of Equatorial Guinea?",
          answer: "Malabo",
          point_value: "$1000"
        }
      ];
      
      await bulkImportQuestions(roomCode, questions);
    } catch (err) {
      console.error('Error creating sample questions:', err);
    }
  };

  // Function to import multiple questions at once
  const bulkImportQuestions = async (roomCode, questions) => {
    try {
      console.log(`Importing ${questions.length} questions for room ${roomCode}`);
      
      // Create each question in sequence
      for (const q of questions) {
        await axios.post(`${API_URL}/rooms/${roomCode}/questions`, q);
      }
      
      setTotalQuestions(questions.length);
      console.log('Questions imported successfully');
      
      return true;
    } catch (err) {
      console.error('Error importing questions:', err);
      setError('Failed to import questions');
      return false;
    }
  };
  
  // Function to parse and import questions from JSON
  const importQuestionsFromJSON = async (jsonText) => {
    try {
      const data = JSON.parse(jsonText);
      
      if (!data.clues || !Array.isArray(data.clues) || data.clues.length === 0) {
        setError('Invalid question format. JSON must contain a "clues" array.');
        return false;
      }
      
      return await bulkImportQuestions(session.roomCode, data.clues);
    } catch (err) {
      console.error('Error parsing question JSON:', err);
      setError('Failed to parse JSON. Make sure it is valid.');
      return false;
    }
  };

  const handleEnableBuzzer = async () => {
    if (!session) return;
    
    try {
      enableBuzzer(session._id);
      setBuzzerEnabled(true);
      setCurrentContestant(null);
    } catch (err) {
      console.error('Error enabling buzzer:', err);
    }
  };

  const handleNextQuestion = async () => {
    if (!session) return;
    
    try {
      const nextIndex = questionIndex + 1;
      console.log('Moving to next question, index:', nextIndex, 'total:', totalQuestions);
      
      socket.emit('next-question', { 
        sessionId: session._id, 
        questionIndex: nextIndex 
      });
      
      // The question-updated event will reset the states
      console.log('Next question event emitted');
    } catch (err) {
      console.error('Error loading next question:', err);
      setError('Failed to load next question');
    }
  };

  // Add a force enable function for testing
  const forceEnableNextQuestion = () => {
    console.log('Forcing answerGiven to true');
    setAnswerGiven(true);
  };

  const handleStartGame = async () => {
    if (!session) return;
    
    try {
      console.log('Starting game with room code:', session.roomCode);
      
      // Update session status to in_progress
      await axios.put(`${API_URL}/rooms/${session.roomCode}`, {
        gameStatus: 'in_progress'
      });
      
      // Update local state immediately to show changes in UI
      setSession(prev => ({
        ...prev,
        gameStatus: 'in_progress'
      }));
      
      console.log('Game status updated to in_progress');
      
      // Load the first question
      socket.emit('next-question', { 
        sessionId: session._id, 
        questionIndex: 0 
      });
      
      console.log('First question requested');
    } catch (err) {
      console.error('Error starting game:', err);
      setError('Failed to start game');
    }
  };

  // Function to add a single question using the simplified form
  const addSingleQuestion = async () => {
    try {
      if (!newQuestion.questionText || !newQuestion.answer || !newQuestion.category) {
        setError('Please fill in all required fields (question, answer, and category)');
        return;
      }

      // Parse point value to ensure it's a number
      const pointValue = parseInt(newQuestion.pointValue, 10);
      if (isNaN(pointValue) || pointValue <= 0) {
        setError('Point value must be a positive number');
        return;
      }

      // Create a validated question object
      const questionToAdd = {
        questionText: newQuestion.questionText,
        answer: newQuestion.answer,
        pointValue: pointValue,
        category: newQuestion.category
      };

      // Submit the question to the API
      await axios.post(`${API_URL}/rooms/${session.roomCode}/questions`, questionToAdd);
      
      // Update total questions count
      setTotalQuestions(prev => prev + 1);
      
      // Clear the form
      setNewQuestion({
        questionText: '',
        answer: '',
        pointValue: 100,
        category: ''
      });
      
      // Show success message
      alert('Question added successfully!');
      
    } catch (err) {
      console.error('Error adding question:', err);
      setError('Failed to add question');
    }
  };

  // Handle input changes for the simple form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewQuestion(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Host Dashboard</h2>
          <div className="text-lg font-semibold bg-blue-100 p-2 rounded">
            Room Code: <span className="text-blue-700">{session?.roomCode}</span>
          </div>
        </div>

        <div className="mb-6">
          <button 
            onClick={handleStartGame}
            disabled={session?.gameStatus !== 'waiting'}
            className={`px-4 py-2 rounded font-bold mr-4 ${
              session?.gameStatus === 'waiting' 
                ? 'bg-green-500 text-white hover:bg-green-600 text-xl animate-pulse' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Start Game {session?.gameStatus === 'waiting' ? '(Click here first!)' : '(Game started)'}
          </button>
          
          <button 
            onClick={handleEnableBuzzer}
            disabled={!currentQuestion || buzzerEnabled || currentContestant}
            className={`px-4 py-2 rounded font-bold mr-4 ${
              !currentQuestion || buzzerEnabled || currentContestant
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {buzzerEnabled ? 'Buzzer Active' : 'Enable Buzzer'}
          </button>
          
          <button 
            onClick={handleNextQuestion}
            disabled={questionIndex >= Math.min(totalQuestions, 15) - 1 || session?.gameStatus === 'waiting'}
            className={`px-4 py-2 rounded font-bold ${
              questionIndex >= Math.min(totalQuestions, 15) - 1 || session?.gameStatus === 'waiting' 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : answerGiven 
                  ? 'bg-purple-500 text-white hover:bg-purple-600 transform hover:scale-105 transition duration-200' 
                  : 'bg-yellow-500 text-white hover:bg-yellow-600'
            }`}
          >
            Next Question {session?.gameStatus === 'waiting' ? '(Start Game First)' : answerGiven ? '(Ready!)' : '(Waiting)'}
          </button>
          
          {!answerGiven && session?.gameStatus !== 'waiting' && currentQuestion && (
            <button 
              onClick={forceEnableNextQuestion}
              className="px-4 py-2 rounded font-bold ml-2 bg-gray-500 text-white hover:bg-gray-600"
            >
              Force Enable
            </button>
          )}
        </div>

        {/* Collapsible Question Import Panel */}
        {session?.gameStatus === 'waiting' && (
          <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Add Questions</h3>
              <div>
                <button 
                  onClick={() => setSimpleFormExpanded(!simpleFormExpanded)}
                  className="px-3 py-1 rounded bg-blue-200 text-blue-800 text-sm mr-2 hover:bg-blue-300"
                >
                  {simpleFormExpanded ? 'Hide Form' : 'Add Single Question'} 
                </button>
                <button 
                  onClick={() => setImportMenuExpanded(!importMenuExpanded)}
                  className="px-3 py-1 rounded bg-blue-200 text-blue-800 text-sm hover:bg-blue-300"
                >
                  {importMenuExpanded ? 'Hide JSON Import' : 'Bulk Import JSON'} 
                </button>
              </div>
            </div>
            
            {/* Simple question form */}
            {simpleFormExpanded && (
              <div className="mt-4 bg-white p-4 rounded border border-blue-100">
                <h4 className="font-medium mb-3">Add a Single Question</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                    <input
                      type="text"
                      name="questionText"
                      value={newQuestion.questionText}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Enter the question text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                    <input
                      type="text"
                      name="answer"
                      value={newQuestion.answer}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Enter the correct answer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        name="category"
                        value={newQuestion.category}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded"
                        placeholder="Enter a category"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Point Value</label>
                      <input
                        type="number"
                        name="pointValue"
                        value={newQuestion.pointValue}
                        onChange={handleInputChange}
                        min="100"
                        step="50"
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  <button
                    onClick={addSingleQuestion}
                    className="px-4 py-2 rounded font-bold bg-green-500 text-white hover:bg-green-600"
                  >
                    Add Question
                  </button>
                </div>
              </div>
            )}
            
            {/* JSON Import section */}
            {importMenuExpanded && (
              <>
                <p className="text-sm text-gray-700 mb-4">
                  Paste your JSON formatted questions below. Questions will appear in random order during the game.
                </p>
                
                <div className="mb-4">
                  <textarea 
                    id="questionsJson"
                    className="w-full h-32 p-2 border border-gray-300 rounded"
                    placeholder={`Paste JSON in this format:
{
  "clues": [
    {
      "round": "jeopardy",
      "category": "CATEGORY_NAME",
      "question": "What is the capital of Spain?",
      "answer": "Madrid",
      "point_value": "$200"
    },
    ...more questions...
  ]
}`}
                  ></textarea>
                </div>
                
                <button
                  onClick={() => {
                    const jsonText = document.getElementById('questionsJson').value;
                    if (jsonText.trim()) {
                      importQuestionsFromJSON(jsonText);
                    } else {
                      setError('Please enter JSON formatted questions');
                    }
                  }}
                  className="px-4 py-2 rounded font-bold bg-blue-500 text-white hover:bg-blue-600"
                >
                  Import Questions
                </button>
              </>
            )}
          </div>
        )}
        
        {/* Collapsible Debug Information */}
        <div className="mb-4 text-xs bg-gray-100 p-2 rounded">
          <div className="flex justify-between items-center" onClick={() => setDebugMenuExpanded(!debugMenuExpanded)} style={{ cursor: 'pointer' }}>
            <p className="text-lg font-bold text-red-600">Debug Information</p>
            <button className="px-2 py-1 rounded bg-gray-200 text-gray-800 text-xs">
              {debugMenuExpanded ? 'Hide' : 'Show'} Details
            </button>
          </div>
          
          {debugMenuExpanded && (
            <div className="flex flex-col space-y-1 bg-white p-2 rounded border border-gray-300 mt-2">
              <p className="font-semibold">Game Status: 
                <span className={`ml-2 px-2 py-1 rounded ${
                  session?.gameStatus === 'waiting' 
                    ? 'bg-yellow-200 text-yellow-800' 
                    : 'bg-green-200 text-green-800'
                }`}>
                  {session?.gameStatus} {session?.gameStatus === 'waiting' && '- Click "Start Game" button first!'}
                </span>
              </p>
              <p className="font-semibold">Answer Given: 
                <span className={`ml-2 px-2 py-1 rounded ${
                  answerGiven 
                    ? 'bg-green-200 text-green-800' 
                    : 'bg-red-200 text-red-800'
                }`}>
                  {answerGiven ? 'true' : 'false'}
                </span>
              </p>
              <p className="font-semibold">Question: 
                <span className="ml-2 px-2 py-1 rounded bg-blue-200 text-blue-800">
                  {questionIndex + 1} of {Math.min(totalQuestions, 15)} (Total Available: {totalQuestions})
                </span>
              </p>
              <p className="font-semibold">Answer Result: 
                <span className={`ml-2 px-2 py-1 rounded ${
                  answerResult 
                    ? answerResult.isCorrect 
                      ? 'bg-green-200 text-green-800' 
                      : 'bg-red-200 text-red-800'
                    : 'bg-gray-200 text-gray-800'
                }`}>
                  {answerResult 
                    ? answerResult.isCorrect 
                      ? 'Correct' 
                      : 'Incorrect' 
                    : 'None'}
                </span>
              </p>
            </div>
          )}
        </div>

        {currentQuestion ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-700">
                {currentQuestion.category}
              </span>
              <span className="font-bold text-blue-700">
                {currentQuestion.pointValue}
              </span>
            </div>
            <p className="text-xl font-medium mb-4">{currentQuestion.questionText}</p>
            
            {answerGiven && (
              <p className="text-gray-600 italic">
                Correct Answer: {currentQuestion.answer}
              </p>
            )}
            
            <div className="mt-2 text-sm text-gray-500">
              Question {questionIndex + 1} of {totalQuestions}
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-lg p-4 mb-6 text-center">
            {session?.gameStatus === 'waiting' 
              ? 'Waiting to start the game...' 
              : 'No question loaded'}
          </div>
        )}

        {currentContestant && (
          <div className={`rounded-lg p-4 mb-6 ${
            answerResult 
              ? answerResult.isCorrect 
                ? 'bg-green-100 border border-green-300' 
                : 'bg-red-100 border border-red-300'
              : 'bg-blue-100 border border-blue-300'
          }`}>
            <p className="font-semibold">
              {answerResult 
                ? answerResult.isCorrect 
                  ? `${currentContestant.name} answered correctly!` 
                  : `${currentContestant.name} answered incorrectly.`
                : `${currentContestant.name} has buzzed in! Waiting for answer...`
              }
            </p>
            {answerResult && (
              <div className="mt-2">
                <p className="font-medium">
                  Answer given: <span className="italic">{answerResult.submittedAnswer}</span>
                </p>
              </div>
            )}
          </div>
        )}
        
        {!currentContestant && answerResult && (
          <div className={`rounded-lg p-4 mb-6 ${
            answerResult.isCorrect 
              ? 'bg-green-100 border border-green-300' 
              : 'bg-red-100 border border-red-300'
          }`}>
            <p className="font-semibold">
              {answerResult.isCorrect 
                ? 'Last answer was correct!' 
                : 'Last answer was incorrect.'}
            </p>
            <div className="mt-2">
              <p className="font-medium">
                Answer given: <span className="italic">{answerResult.submittedAnswer}</span>
              </p>
            </div>
          </div>
        )}

        <Scoreboard roomCode={session?.roomCode} />
      </div>
    </div>
  );
};

export default HostDashboard; 