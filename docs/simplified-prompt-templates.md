# Simplified LLM Prompt Templates for IGCSE Content Generation

## Quiz Question Generation Template

```
You are an expert IGCSE {subject} educator creating assessment questions for Grade {grade} students.

Topic: {topic_title}
Syllabus Code: {syllabus_code}
Difficulty Level: {difficulty_level}/5
Question Count: {question_count}

Generate {question_count} high-quality IGCSE {subject} questions covering the topic "{topic_title}".

Requirements:
- Follow Cambridge IGCSE {subject} curriculum standards
- Include a mix of multiple choice (60%) and short answer (40%) questions
- Ensure questions test understanding, not just memorization
- Provide clear, accurate answers with brief explanations
- Use appropriate scientific terminology and notation
- Match the specified difficulty level

Return JSON format:
{
  "questions": [
    {
      "question_text": "Clear, specific question text",
      "question_type": "multiple_choice" | "short_answer",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"] | null,
      "correct_answer": "A" | "specific answer text",
      "explanation": "Brief explanation of why this is correct",
      "difficulty_level": 1-5,
      "points": 1-3,
      "syllabus_reference": "{syllabus_code}"
    }
  ]
}
```

## Exam Paper Generation Template

```
You are an expert IGCSE {subject} examiner creating a formal exam paper for Grade {grade} students.

Topic: {topic_title}
Syllabus Code: {syllabus_code}
Paper Duration: {duration} minutes
Total Marks: {total_marks}

Create a complete IGCSE {subject} exam paper section covering "{topic_title}".

Requirements:
- Follow official IGCSE exam paper format and style
- Include command words (state, explain, describe, calculate, etc.)
- Provide appropriate mark allocations
- Include a variety of question types and difficulty levels
- Ensure questions are printer-friendly and clearly formatted
- Include space indicators for student answers

Return JSON format:
{
  "title": "IGCSE {subject} - {topic_title}",
  "instructions": "Answer ALL questions. Show your working clearly.",
  "duration_minutes": {duration},
  "total_marks": {total_marks},
  "questions": [
    {
      "question_number": "1",
      "question_text": "Question with clear instructions",
      "marks": 3,
      "answer_space_lines": 4,
      "command_words": ["explain", "describe"],
      "difficulty_level": 1-5
    }
  ]
}
```

## Flashcard Generation Template

```
You are an expert IGCSE {subject} educator creating study flashcards for Grade {grade} students.

Topic: {topic_title}
Syllabus Code: {syllabus_code}
Card Count: {card_count}

Generate {card_count} effective study flashcards for the topic "{topic_title}".

Requirements:
- Create clear, concise question-answer pairs
- Focus on key concepts, definitions, and formulas
- Use active recall principles
- Include memory aids and mnemonics where helpful
- Ensure answers are complete but not overwhelming

Return JSON format:
{
  "flashcards": [
    {
      "front_content": "Clear question or term",
      "back_content": "Comprehensive but concise answer",
      "card_type": "basic",
      "difficulty_level": 1-5,
      "tags": ["concept", "definition", "formula"],
      "hint": "Optional memory aid or hint",
      "syllabus_reference": "{syllabus_code}"
    }
  ]
}
```

## Cost Optimization Features

### Token Efficiency
- Concise prompts that maximize output quality per token
- Structured JSON responses to minimize parsing overhead
- Reusable prompt templates to reduce redundancy

### Model Selection Logic
```javascript
function selectOptimalModel(contentType, complexity, budget) {
  if (budget === 'minimal' && complexity <= 3) {
    return 'gemini-1.5-flash'; // ~$0.075/1M tokens
  } else if (complexity <= 4) {
    return 'gpt-4o-mini'; // ~$0.15/1M tokens
  } else {
    return 'claude-3-haiku'; // ~$0.25/1M tokens
  }
}
```

### Batch Processing
- Generate multiple questions in single API call
- Combine related content types (quiz + flashcards)
- Cache common curriculum data to reduce prompt size
