import React, { useState, useEffect, useCallback } from 'react';
import { useSubjects } from '../hooks/useSubjects';
import { useTopics } from '../hooks/useTopics';
import { useFlashcards } from '../hooks/useFlashcards';
import { useFlashcardProgress } from '../hooks/useFlashcardProgress';

const FlashcardsPage: React.FC = () => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  
  // Fetch subjects, topics, and flashcards using our custom hooks
  const { subjects, loading: subjectsLoading } = useSubjects();
  const { topics, loading: topicsLoading } = useTopics(selectedSubjectId);
  const { flashcards, loading: flashcardsLoading, error: flashcardsError } = useFlashcards(selectedTopicId);
  const { updateFlashcardProgress, loading: progressLoading } = useFlashcardProgress();

  // Reset topic selection when subject changes
  useEffect(() => {
    setSelectedTopicId(null);
    setActiveCardIndex(0);
    setIsFlipped(false);
  }, [selectedSubjectId]);

  // Reset card index when topic changes
  useEffect(() => {
    setActiveCardIndex(0);
    setIsFlipped(false);
  }, [selectedTopicId]);

  // Handle subject selection
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjectId = e.target.value || null;
    setSelectedSubjectId(subjectId);
  };

  // Handle topic selection
  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const topicId = e.target.value || null;
    setSelectedTopicId(topicId);
  };

  const handlePerformanceRating = useCallback(async (performance: 'easy' | 'medium' | 'hard') => {
    if (!flashcards[activeCardIndex]) return;

    await updateFlashcardProgress(flashcards[activeCardIndex].id, performance);

    if (activeCardIndex < flashcards.length - 1) {
      setActiveCardIndex(activeCardIndex + 1);
      setIsFlipped(false);
    } else {
      // Last card, maybe show a summary or a 'Done' message
      alert('You have completed all the flashcards for this topic!');
    }
  }, [activeCardIndex, flashcards, updateFlashcardProgress]);

  // Flip the current card
  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  // Navigate to the next card
  const nextCard = () => {
    if (activeCardIndex < flashcards.length - 1) {
      setActiveCardIndex(activeCardIndex + 1);
      setIsFlipped(false);
    }
  };

  // Navigate to the previous card
  const prevCard = () => {
    if (activeCardIndex > 0) {
      setActiveCardIndex(activeCardIndex - 1);
      setIsFlipped(false);
    }
  };

  // Calculate progress statistics
  const totalCards = flashcards.length;
  const currentCardNumber = totalCards > 0 ? activeCardIndex + 1 : 0;

  return (
    <div>
      <div className="mb-8">
        <h1>Flashcards</h1>
        <p className="text-neutral-600">
          Study with interactive flashcards using spaced repetition for better retention.
        </p>
      </div>
      
      {/* Subject and Topic Selection */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="subject-select" className="block text-sm font-medium text-neutral-700 mb-1">
              Select Subject
            </label>
            <select
              id="subject-select"
              className="w-full p-2 border border-neutral-300 rounded-md"
              value={selectedSubjectId || ''}
              onChange={handleSubjectChange}
              disabled={subjectsLoading}
            >
              <option value="">-- Select a Subject --</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="topic-select" className="block text-sm font-medium text-neutral-700 mb-1">
              Select Topic ({topics.length} available)
            </label>
            <select
              id="topic-select"
              className="w-full p-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={selectedTopicId || ''}
              onChange={handleTopicChange}
              disabled={!selectedSubjectId || topicsLoading}
            >
              <option value="">-- Select a Topic --</option>
              {topics
                .sort((a, b) => (a.major_area || '').localeCompare(b.major_area || '') || a.title.localeCompare(b.title))
                .map((topic) => {
                  const hasContent = topic.content && topic.content.trim().length > 0;
                  const difficultyLabel = ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'][topic.difficulty_level] || 'Unknown';
                  return (
                    <option key={topic.id} value={topic.id}>
                      {topic.major_area} → {topic.title} ({difficultyLabel}) {!hasContent ? '⚠️ No Content' : ''}
                    </option>
                  );
                })}
            </select>
            {topics.length > 0 && (
              <p className="text-xs text-neutral-500 mt-1">
                Topics are grouped by major area and sorted alphabetically
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Flashcard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-neutral-600">Current Card:</span>
              <span className="font-semibold">{currentCardNumber} / {totalCards}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Cards Available:</span>
              <span className="font-semibold text-primary-600">{totalCards}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Selected Topic:</span>
              <span className="font-semibold">
                {selectedTopicId ? topics.find(t => t.id === selectedTopicId)?.title || 'Loading...' : 'None'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Study Progress</h2>
          {selectedSubjectId ? (
            <div className="space-y-3">
              {topics.filter(topic => topic.subject_id === selectedSubjectId).map(topic => (
                <div key={topic.id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-neutral-600">{topic.title}</span>
                    <span className="text-sm text-neutral-600">
                      {topic.id === selectedTopicId ? `${currentCardNumber}/${totalCards}` : '0/0'}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ 
                        width: topic.id === selectedTopicId && totalCards > 0 
                          ? `${(currentCardNumber / totalCards) * 100}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500">Select a subject to view progress</p>
          )}
        </div>
      </div>
      
      {/* Flashcard Display */}
      {selectedTopicId ? (
        flashcardsLoading ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <div className="animate-pulse">
              <div className="h-64 bg-neutral-200 rounded-lg mb-4"></div>
              <div className="h-6 bg-neutral-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        ) : flashcardsError ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h2 className="text-xl font-semibold">Error Loading Flashcards</h2>
              <p className="text-neutral-600 mt-2">{flashcardsError}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
            >
              Try Again
            </button>
          </div>
        ) : flashcards.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <div className="mb-6">
              <svg className="w-16 h-16 text-neutral-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path>
              </svg>
              <h2 className="text-xl font-semibold mb-2">No Flashcards Available</h2>
              <p className="text-neutral-600 mb-6">
                There are no flashcards available for this topic yet. Please select another topic or check back later.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            {/* Flashcard */}
            <div 
              className="relative w-full h-64 mb-4 cursor-pointer" 
              style={{ perspective: '1000px' }}
              onClick={!isFlipped ? flipCard : undefined}
            >
              <div 
                className="relative w-full h-full transition-transform duration-500 bg-white rounded-lg shadow-lg"
                style={{ 
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  height: '100%',
                  width: '100%',
                  position: 'relative'
                }}
              >
                {/* Front of card */}
                <div 
                  style={{
                    position: 'absolute',
                    height: '100%',
                    width: '100%',
                    backfaceVisibility: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '2rem'
                  }}
                >
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-4">Question</h3>
                    <p className="text-lg">{flashcards[activeCardIndex]?.front_content}</p>
                    {flashcards[activeCardIndex]?.hint && (
                      <div className="mt-4 text-sm text-neutral-500">
                        <p className="font-medium">Hint:</p>
                        <p>{flashcards[activeCardIndex].hint}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Back of card */}
                <div 
                  style={{
                    position: 'absolute',
                    height: '100%',
                    width: '100%',
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '2rem',
                    backgroundColor: '#f8fafc'
                  }}
                >
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-4">Answer</h3>
                    <p className="text-lg">{flashcards[activeCardIndex]?.back_content}</p>
                    {flashcards[activeCardIndex]?.explanation && (
                      <div className="mt-4 text-sm text-neutral-600">
                        <p className="font-medium">Explanation:</p>
                        <p>{flashcards[activeCardIndex].explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Navigation and Performance Rating */}
            <div className="flex justify-center items-center space-x-4 mt-6">
              {!isFlipped ? (
                <button 
                  onClick={flipCard}
                  className="w-full md:w-1/2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-lg transition duration-150 ease-in-out"
                >
                  Show Answer
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => handlePerformanceRating('hard')}
                    disabled={progressLoading}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg"
                  >
                    Hard
                  </button>
                  <button 
                    onClick={() => handlePerformanceRating('medium')}
                    disabled={progressLoading}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-lg"
                  >
                    Medium
                  </button>
                  <button 
                    onClick={() => handlePerformanceRating('easy')}
                    disabled={progressLoading}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg"
                  >
                    Easy
                  </button>
                </>
              )}
            </div>

            {/* Previous/Next for debugging or review, can be removed */}
            <div className="flex justify-between items-center mt-4">
              <button 
                onClick={prevCard}
                disabled={activeCardIndex === 0}
                className={`px-4 py-2 rounded-md ${
                  activeCardIndex === 0 
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' 
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                }`}
              >
                Previous Card
              </button>
              
              <span className="text-neutral-600">
                {currentCardNumber} of {totalCards}
              </span>
              
              <button 
                onClick={nextCard}
                disabled={activeCardIndex === flashcards.length - 1}
                className={`px-4 py-2 rounded-md ${
                  activeCardIndex === flashcards.length - 1 
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' 
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
              >
                Next Card
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 text-neutral-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path>
            </svg>
            <h2 className="text-xl font-semibold mb-2">Select a Topic to Start</h2>
            <p className="text-neutral-600 mb-6">
              Choose a subject and topic from the dropdown menus above to start studying with flashcards.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashcardsPage;
