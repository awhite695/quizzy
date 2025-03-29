import React, { useState, useEffect } from 'react';
import { socket } from '../utils/socket';

const SpeechToText = ({ sessionId, contestantId, questionId }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalAnswer, setFinalAnswer] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };
    
    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const text = result[0].transcript;
      
      setTranscript(text);
      
      if (result.isFinal) {
        setFinalAnswer(text);
        stopListening();
        
        // Send answer to server
        socket.emit('submit-answer', {
          sessionId,
          contestantId,
          questionId,
          answer: text
        });
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    // Start listening automatically
    startListening();
    
    function startListening() {
      try {
        recognition.start();
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
    
    function stopListening() {
      try {
        recognition.stop();
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    }
    
    // Clean up
    return () => {
      stopListening();
    };
  }, [sessionId, contestantId, questionId]);

  return (
    <div className="p-4 border rounded-lg bg-white">
      {error ? (
        <div className="text-red-600 mb-2">{error}</div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <div className={`w-3 h-3 rounded-full mr-2 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="font-medium">
                {isListening ? 'Listening...' : 'Finished listening'}
              </span>
            </div>
            
            {isListening && (
              <div className="bg-gray-100 p-3 rounded">
                <p className="italic">{transcript || 'Speak your answer...'}</p>
              </div>
            )}
          </div>
          
          {finalAnswer && (
            <div className="mt-4">
              <h3 className="font-semibold mb-1">Your Answer:</h3>
              <p className="bg-blue-50 p-3 rounded border border-blue-200">
                {finalAnswer}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SpeechToText; 