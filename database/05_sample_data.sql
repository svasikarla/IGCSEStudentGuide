-- =====================================================
-- IGCSE Student Guide - Sample Data
-- File 5: Test Data for Development
-- =====================================================
-- Execute this file last to populate the database with sample data

-- =====================================================
-- SUBJECTS DATA
-- =====================================================

INSERT INTO public.subjects (id, name, code, description, color_hex, icon_name, curriculum_board, grade_levels, display_order) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'Mathematics',
    'MATH',
    'Core mathematical concepts including algebra, geometry, statistics, and calculus fundamentals for IGCSE students.',
    '#3b82f6',
    'calculator',
    'Cambridge IGCSE',
    '{9,10}',
    1
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'Physics',
    'PHYS',
    'Fundamental physics principles covering mechanics, electricity, magnetism, waves, and modern physics.',
    '#10b981',
    'atom',
    'Cambridge IGCSE',
    '{9,10}',
    2
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'Chemistry',
    'CHEM',
    'Chemical principles, reactions, atomic structure, and practical chemistry for IGCSE level.',
    '#8b5cf6',
    'flask',
    'Cambridge IGCSE',
    '{9,10}',
    3
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    'Biology',
    'BIOL',
    'Life sciences covering cell biology, genetics, ecology, human biology, and plant biology.',
    '#ef4444',
    'leaf',
    'Cambridge IGCSE',
    '{9,10}',
    4
),
(
    '550e8400-e29b-41d4-a716-446655440005',
    'English Language',
    'ENGL',
    'English language skills including reading comprehension, writing, speaking, and listening.',
    '#f59e0b',
    'book-open',
    'Cambridge IGCSE',
    '{9,10}',
    5
),
(
    '550e8400-e29b-41d4-a716-446655440006',
    'History',
    'HIST',
    'World history focusing on 19th and 20th centuries, including major events, causes, and consequences.',
    '#6366f1',
    'clock',
    'Cambridge IGCSE',
    '{9,10}',
    6
);

-- =====================================================
-- TOPICS DATA
-- =====================================================

-- Mathematics Topics
INSERT INTO public.topics (id, subject_id, title, slug, description, content, difficulty_level, estimated_study_time_minutes, learning_objectives, display_order) VALUES
(
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'Algebra Fundamentals',
    'algebra-fundamentals',
    'Basic algebraic concepts including variables, expressions, and simple equations.',
    '# Algebra Fundamentals

## Introduction
Algebra is the branch of mathematics that uses letters and symbols to represent numbers and quantities in formulas and equations.

## Key Concepts
- Variables and constants
- Algebraic expressions
- Simplifying expressions
- Solving linear equations

## Examples
Solve for x: 2x + 5 = 13
- Subtract 5 from both sides: 2x = 8
- Divide by 2: x = 4',
    2,
    45,
    '{"Understand variables and constants", "Simplify algebraic expressions", "Solve linear equations"}',
    1
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'Quadratic Equations',
    'quadratic-equations',
    'Understanding and solving quadratic equations using various methods.',
    '# Quadratic Equations

## Standard Form
A quadratic equation has the form: ax² + bx + c = 0

## Solving Methods
1. Factoring
2. Quadratic formula
3. Completing the square

## The Quadratic Formula
x = (-b ± √(b² - 4ac)) / 2a',
    4,
    60,
    '{"Identify quadratic equations", "Use the quadratic formula", "Factor quadratic expressions"}',
    2
);

-- Physics Topics
INSERT INTO public.topics (id, subject_id, title, slug, description, content, difficulty_level, estimated_study_time_minutes, learning_objectives, display_order) VALUES
(
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440002',
    'Forces and Motion',
    'forces-and-motion',
    'Newton''s laws of motion and their applications in everyday situations.',
    '# Forces and Motion

## Newton''s Laws of Motion

### First Law (Law of Inertia)
An object at rest stays at rest, and an object in motion stays in motion, unless acted upon by an external force.

### Second Law
F = ma (Force equals mass times acceleration)

### Third Law
For every action, there is an equal and opposite reaction.',
    3,
    50,
    '{"Understand Newton''s three laws", "Calculate force, mass, and acceleration", "Apply laws to real situations"}',
    1
),
(
    '660e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440002',
    'Electricity and Circuits',
    'electricity-circuits',
    'Basic electrical concepts including current, voltage, resistance, and circuit analysis.',
    '# Electricity and Circuits

## Basic Concepts
- **Current (I)**: Flow of electric charge, measured in Amperes (A)
- **Voltage (V)**: Electric potential difference, measured in Volts (V)
- **Resistance (R)**: Opposition to current flow, measured in Ohms (Ω)

## Ohm''s Law
V = IR

## Circuit Types
- Series circuits
- Parallel circuits',
    3,
    55,
    '{"Understand current, voltage, and resistance", "Apply Ohm''s law", "Analyze series and parallel circuits"}',
    2
);

-- Chemistry Topics
INSERT INTO public.topics (id, subject_id, title, slug, description, content, difficulty_level, estimated_study_time_minutes, learning_objectives, display_order) VALUES
(
    '660e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440003',
    'Atomic Structure',
    'atomic-structure',
    'Understanding atoms, electrons, protons, neutrons, and electron configuration.',
    '# Atomic Structure

## Components of an Atom
- **Protons**: Positively charged particles in the nucleus
- **Neutrons**: Neutral particles in the nucleus
- **Electrons**: Negatively charged particles orbiting the nucleus

## Electron Configuration
Electrons occupy energy levels (shells) around the nucleus:
- First shell: maximum 2 electrons
- Second shell: maximum 8 electrons
- Third shell: maximum 18 electrons',
    2,
    40,
    '{"Identify atomic particles", "Understand electron shells", "Write electron configurations"}',
    1
);

-- Biology Topics
INSERT INTO public.topics (id, subject_id, title, slug, description, content, difficulty_level, estimated_study_time_minutes, learning_objectives, display_order) VALUES
(
    '660e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440004',
    'Cell Structure and Function',
    'cell-structure-function',
    'Basic cell biology including organelles and their functions.',
    '# Cell Structure and Function

## Types of Cells
- **Prokaryotic**: No nucleus (bacteria)
- **Eukaryotic**: Has nucleus (plants, animals)

## Key Organelles
- **Nucleus**: Controls cell activities
- **Mitochondria**: Powerhouse of the cell
- **Ribosomes**: Protein synthesis
- **Cell membrane**: Controls what enters/exits',
    2,
    35,
    '{"Distinguish cell types", "Identify organelles", "Understand organelle functions"}',
    1
);

-- =====================================================
-- FLASHCARDS DATA
-- =====================================================

-- Mathematics Flashcards
INSERT INTO public.flashcards (id, topic_id, front_content, back_content, difficulty_level, tags, hint, explanation) VALUES
(
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    'What is a variable in algebra?',
    'A variable is a letter or symbol that represents an unknown number or value.',
    1,
    '{"algebra", "variables", "basics"}',
    'Think about what changes in mathematical expressions',
    'Variables like x, y, or z can represent any number and allow us to write general mathematical statements.'
),
(
    '770e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440001',
    'Solve: 3x + 7 = 22',
    'x = 5',
    2,
    '{"algebra", "equations", "solving"}',
    'Isolate x by doing the same operation to both sides',
    'Subtract 7 from both sides: 3x = 15, then divide by 3: x = 5'
),
(
    '770e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440002',
    'What is the quadratic formula?',
    'x = (-b ± √(b² - 4ac)) / 2a',
    3,
    '{"quadratic", "formula", "equations"}',
    'Remember the pattern: negative b, plus or minus...',
    'This formula can solve any quadratic equation in the form ax² + bx + c = 0'
);

-- Physics Flashcards
INSERT INTO public.flashcards (id, topic_id, front_content, back_content, difficulty_level, tags, hint, explanation) VALUES
(
    '770e8400-e29b-41d4-a716-446655440004',
    '660e8400-e29b-41d4-a716-446655440003',
    'State Newton''s First Law of Motion',
    'An object at rest stays at rest, and an object in motion stays in motion, unless acted upon by an external force.',
    2,
    '{"newton", "laws", "motion", "inertia"}',
    'This is also called the Law of Inertia',
    'This law explains why you lurch forward when a car suddenly stops - your body wants to keep moving!'
),
(
    '770e8400-e29b-41d4-a716-446655440005',
    '660e8400-e29b-41d4-a716-446655440003',
    'What is the formula for Newton''s Second Law?',
    'F = ma (Force = mass × acceleration)',
    2,
    '{"newton", "force", "acceleration", "mass"}',
    'Force equals mass times what?',
    'This shows that force is directly proportional to both mass and acceleration'
),
(
    '770e8400-e29b-41d4-a716-446655440006',
    '660e8400-e29b-41d4-a716-446655440004',
    'What is Ohm''s Law?',
    'V = IR (Voltage = Current × Resistance)',
    2,
    '{"ohm", "voltage", "current", "resistance"}',
    'Voltage equals current times what?',
    'This fundamental law relates the three basic electrical quantities'
);

-- Chemistry Flashcards
INSERT INTO public.flashcards (id, topic_id, front_content, back_content, difficulty_level, tags, hint, explanation) VALUES
(
    '770e8400-e29b-41d4-a716-446655440007',
    '660e8400-e29b-41d4-a716-446655440005',
    'What are the three main subatomic particles?',
    'Protons, neutrons, and electrons',
    1,
    '{"atoms", "particles", "structure"}',
    'Two are in the nucleus, one orbits around it',
    'Protons and neutrons are in the nucleus, while electrons orbit in shells around the nucleus'
),
(
    '770e8400-e29b-41d4-a716-446655440008',
    '660e8400-e29b-41d4-a716-446655440005',
    'What is the maximum number of electrons in the first shell?',
    '2 electrons',
    2,
    '{"electrons", "shells", "configuration"}',
    'The innermost shell has the smallest capacity',
    'The first shell (K shell) can hold a maximum of 2 electrons'
);

-- Biology Flashcards
INSERT INTO public.flashcards (id, topic_id, front_content, back_content, difficulty_level, tags, hint, explanation) VALUES
(
    '770e8400-e29b-41d4-a716-446655440009',
    '660e8400-e29b-41d4-a716-446655440006',
    'What is the function of mitochondria?',
    'To produce energy (ATP) for the cell - known as the powerhouse of the cell',
    2,
    '{"mitochondria", "energy", "ATP", "organelles"}',
    'Think about what cells need to function',
    'Mitochondria convert glucose and oxygen into ATP through cellular respiration'
),
(
    '770e8400-e29b-41d4-a716-446655440010',
    '660e8400-e29b-41d4-a716-446655440006',
    'What controls what enters and exits the cell?',
    'The cell membrane (plasma membrane)',
    1,
    '{"cell membrane", "transport", "selective permeability"}',
    'Think about the boundary of the cell',
    'The cell membrane is selectively permeable, allowing some substances through while blocking others'
);

-- =====================================================
-- QUIZZES DATA
-- =====================================================

-- Mathematics Quiz
INSERT INTO public.quizzes (id, topic_id, title, description, quiz_type, difficulty_level, time_limit_minutes, passing_score_percentage) VALUES
(
    '880e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    'Algebra Fundamentals Quiz',
    'Test your understanding of basic algebraic concepts and equation solving.',
    'practice',
    2,
    15,
    70
);

-- Physics Quiz
INSERT INTO public.quizzes (id, topic_id, title, description, quiz_type, difficulty_level, time_limit_minutes, passing_score_percentage) VALUES
(
    '880e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440003',
    'Forces and Motion Quiz',
    'Test your knowledge of Newton''s laws and their applications.',
    'practice',
    3,
    20,
    75
);

-- =====================================================
-- QUIZ QUESTIONS DATA
-- =====================================================

-- Algebra Quiz Questions
INSERT INTO public.quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, explanation, points, display_order) VALUES
(
    '990e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440001',
    'What is the value of x in the equation 2x + 6 = 14?',
    'multiple_choice',
    '{"A": "2", "B": "4", "C": "6", "D": "8"}',
    'B',
    'Subtract 6 from both sides: 2x = 8, then divide by 2: x = 4',
    1,
    1
),
(
    '990e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440001',
    'Which of the following is a variable?',
    'multiple_choice',
    '{"A": "5", "B": "x", "C": "10", "D": "π"}',
    'B',
    'A variable is a letter that represents an unknown value, like x, y, or z',
    1,
    2
),
(
    '990e8400-e29b-41d4-a716-446655440003',
    '880e8400-e29b-41d4-a716-446655440001',
    'Simplify: 3x + 2x',
    'multiple_choice',
    '{"A": "5x", "B": "6x", "C": "5x²", "D": "6"}',
    'A',
    'Combine like terms: 3x + 2x = (3 + 2)x = 5x',
    1,
    3
);

-- Physics Quiz Questions
INSERT INTO public.quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, explanation, points, display_order) VALUES
(
    '990e8400-e29b-41d4-a716-446655440004',
    '880e8400-e29b-41d4-a716-446655440002',
    'According to Newton''s First Law, what happens to an object at rest?',
    'multiple_choice',
    '{"A": "It starts moving", "B": "It stays at rest unless acted upon by a force", "C": "It accelerates", "D": "It changes direction"}',
    'B',
    'Newton''s First Law states that objects at rest stay at rest unless acted upon by an external force',
    1,
    1
),
(
    '990e8400-e29b-41d4-a716-446655440005',
    '880e8400-e29b-41d4-a716-446655440002',
    'If a 10 kg object accelerates at 5 m/s², what is the net force?',
    'multiple_choice',
    '{"A": "2 N", "B": "15 N", "C": "50 N", "D": "0.5 N"}',
    'C',
    'Using F = ma: F = 10 kg × 5 m/s² = 50 N',
    2,
    2
);

-- Add comments
COMMENT ON TABLE public.subjects IS 'Sample IGCSE subjects with realistic metadata';
COMMENT ON TABLE public.topics IS 'Sample topics with markdown content for testing';
COMMENT ON TABLE public.flashcards IS 'Sample flashcards covering various difficulty levels';
COMMENT ON TABLE public.quizzes IS 'Sample quizzes with different types and difficulty levels';
COMMENT ON TABLE public.quiz_questions IS 'Sample multiple choice questions with explanations';
