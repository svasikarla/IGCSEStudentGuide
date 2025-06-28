import React from 'react';
import { ExamPaper } from '../hooks/useExamPapers';
import '../styles/print.css';

interface PrintablePaperProps {
  paper: ExamPaper;
  subjectName?: string;
  topicTitle?: string;
  timeAllocation?: string;
  instructions?: string[];
}

const PrintablePaper: React.FC<PrintablePaperProps> = ({
  paper,
  subjectName = "IGCSE Subject",
  topicTitle = "Practice Topic",
  timeAllocation = "1 hour 30 minutes",
  instructions = [
    "Answer ALL questions.",
    "Write your answers in the spaces provided.",
    "Show all your working clearly.",
    "Calculators may be used."
  ]
}) => {

  const handlePrint = () => {
    window.print();
  };

  // Calculate answer space based on marks
  const getAnswerSpaceHeight = (marks: number) => {
    if (marks <= 2) return 'h-16'; // 4rem
    if (marks <= 5) return 'h-24'; // 6rem
    if (marks <= 10) return 'h-32'; // 8rem
    return 'h-40'; // 10rem
  };

  // Generate answer lines for written responses
  const generateAnswerLines = (marks: number) => {
    const lineCount = Math.max(3, Math.min(marks * 2, 12));
    return Array.from({ length: lineCount }, (_, i) => (
      <div key={i} className="border-b border-gray-300 h-6 mb-1"></div>
    ));
  };

  // Detect if question is multiple choice
  const isMultipleChoice = (questionText: string) => {
    return questionText.includes('A)') || questionText.includes('a)') ||
           questionText.includes('A.') || questionText.includes('a.') ||
           questionText.match(/\b[A-D]\)/g) || questionText.match(/\b[a-d]\)/g);
  };

  // Generate multiple choice answer boxes
  const generateMCQAnswerBoxes = () => (
    <div className="flex gap-8 mt-4">
      {['A', 'B', 'C', 'D'].map(option => (
        <div key={option} className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-black"></div>
          <span className="font-medium">{option}</span>
        </div>
      ))}
    </div>
  );

  return (
    <>

      {/* Print Button - Hidden in print */}
      <div className="no-print mb-6 text-center">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-soft"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Exam Paper
          </span>
        </button>
      </div>

      {/* Printable Exam Paper */}
      <div className="printable-paper bg-white">
        {/* Exam Header */}
        <div className="border-2 border-black p-4 mb-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">INTERNATIONAL GENERAL CERTIFICATE OF SECONDARY EDUCATION</h1>
            <h2 className="text-xl font-semibold mb-4">{subjectName.toUpperCase()}</h2>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p><strong>Paper:</strong> {topicTitle}</p>
                <p><strong>Time:</strong> {timeAllocation}</p>
              </div>
              <div>
                <p><strong>Total Marks:</strong> {paper.total_marks}</p>
                <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Student Information Section */}
        <div className="border border-black p-4 mb-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="mb-2"><strong>Candidate Name:</strong></p>
              <div className="border-b-2 border-black h-8"></div>
            </div>
            <div>
              <p className="mb-2"><strong>Candidate Number:</strong></p>
              <div className="border-b-2 border-black h-8"></div>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2"><strong>Centre Number:</strong></p>
            <div className="border-b-2 border-black h-8 w-48"></div>
          </div>
        </div>

        {/* Instructions */}
        <div className="border border-black p-4 mb-6">
          <h3 className="font-bold mb-3">INSTRUCTIONS TO CANDIDATES</h3>
          <ul className="list-disc list-inside space-y-1">
            {instructions.map((instruction, index) => (
              <li key={index} className="text-sm">{instruction}</li>
            ))}
          </ul>
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {paper.questions.map((q, index) => (
            <div key={q.id} className="avoid-break">
              {/* Page break for every 3-4 questions */}
              {index > 0 && index % 3 === 0 && <div className="page-break"></div>}

              <div className="border-l-4 border-gray-300 pl-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-bold">Question {index + 1}</h4>
                  <div className="text-right">
                    <p className="font-semibold">[{q.marks} {q.marks === 1 ? 'mark' : 'marks'}]</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">{q.question_text}</p>
                </div>

                {/* Answer Space */}
                <div className="mt-6 mb-8">
                  {isMultipleChoice(q.question_text) ? (
                    /* Multiple Choice Answer Section */
                    <div className="border border-gray-400 p-4">
                      <p className="text-sm text-gray-600 mb-3">Select the correct answer by marking the appropriate box:</p>
                      {generateMCQAnswerBoxes()}

                      {/* Show working space for MCQ if marks > 1 */}
                      {q.marks > 1 && (
                        <div className="mt-6 border-t border-gray-300 pt-4">
                          <p className="text-sm text-gray-600 mb-3">Show your working (if required):</p>
                          <div className="space-y-1">
                            {generateAnswerLines(Math.min(q.marks, 4))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Written Answer Section */
                    <div className="border border-gray-400 p-4 min-h-[120px]">
                      <p className="text-sm text-gray-600 mb-3">Write your answer in the space below:</p>
                      <div className="space-y-1">
                        {generateAnswerLines(q.marks)}
                      </div>

                      {/* Additional space for calculations if high marks */}
                      {q.marks > 5 && (
                        <div className="mt-6 border-t border-gray-300 pt-4">
                          <p className="text-sm text-gray-600 mb-3">Space for working/calculations:</p>
                          <div className={`${getAnswerSpaceHeight(q.marks)} border border-gray-200`}></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t-2 border-black text-center">
          <p className="text-sm font-semibold">END OF PAPER</p>
          <div className="mt-4 flex justify-between text-xs">
            <span>© IGCSE Study Guide {new Date().getFullYear()}</span>
            <span>Page {Math.ceil(paper.questions.length / 3)} of {Math.ceil(paper.questions.length / 3)}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintablePaper;
