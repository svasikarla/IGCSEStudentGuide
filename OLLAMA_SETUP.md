# Ollama Question Generation Setup Guide

This guide will help you set up the standalone Python module for generating IGCSE quiz questions using your local Ollama + Gemma 3 4B model.

## Prerequisites

✅ **Already Completed:**
- Ollama installed and running
- Gemma 3 4B model downloaded (`ollama list` shows `gemma3:4b`)
- Python 3.8+ installed
- IGCSE Study Guide project setup

## Step 1: Install Python Dependencies

```bash
# Navigate to your project directory
cd "D:\GrowthSch\IGCSEStuGuide"

# Install the Ollama generation dependencies
pip install -r requirements-ollama.txt
```

## Step 2: Update Database Schema

1. **Open Supabase SQL Editor:**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor

2. **Run the schema update:**
   - Copy the contents of `database/05_ollama_generation_schema.sql`
   - Paste and execute in SQL Editor
   - This adds generation tracking fields to your quiz_questions table

## Step 3: Verify Setup

Run the basic test script to ensure everything is working:

```bash
python scripts/test_ollama_basic.py
```

This will test:
- ✅ Environment variables
- ✅ Ollama connection
- ✅ Database connection  
- ✅ Basic text generation
- ✅ JSON generation (critical for question format)

## Step 4: Test Question Generation

Once the basic tests pass, try generating your first questions:

```bash
# Check system status
python scripts/ollama_question_generator.py status

# Find a topic ID to test with (check your database)
# Then generate quiz questions for that topic
python scripts/ollama_question_generator.py generate-quiz --topic-id <your-topic-id> --count 3

# Generate an exam paper
python scripts/ollama_question_generator.py generate-exam --topic-id <your-topic-id> --marks 20
```

## Step 5: Batch Generation (Optional)

For bulk generation across subjects:

```bash
# Generate questions for all topics in Mathematics
python scripts/ollama_question_generator.py batch-generate --subject Mathematics --count 5

# Generate for top priority topics
python scripts/ollama_question_generator.py batch-generate --max-topics 5
```

## Step 6: Set Up Automation (Optional)

To run automated daily generation:

```bash
# Start the scheduler for daily generation at 2 AM
python scripts/ollama_question_generator.py scheduler --start --frequency daily

# Or run manual generation once
python scripts/ollama_question_generator.py scheduler --run-once
```

## Troubleshooting

### Common Issues:

**1. "Ollama not responding"**
```bash
# Start Ollama service
ollama serve
```

**2. "Model not found"**
```bash
# Verify your model
ollama list
# Should show gemma3:4b
```

**3. "Database connection failed"**
- Check your `.env.local` file has correct Supabase credentials
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set

**4. "Import errors"**
```bash
# Install missing dependencies
pip install -r requirements-ollama.txt
```

**5. "JSON parsing failed"**
- This is normal for some responses
- The system will retry automatically
- Check model is responding correctly with basic test

## Configuration

### Environment Variables (in .env.local):
```bash
# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_DEFAULT_MODEL=gemma3:4b
OLLAMA_TIMEOUT=120
OLLAMA_MAX_RETRIES=3

# Question Generation Settings
QUESTION_GENERATION_ENABLED=true
GENERATION_BATCH_SIZE=10
MAX_DAILY_GENERATIONS=100

# Quality Settings
MIN_QUALITY_SCORE=0.7
ENABLE_QUALITY_VALIDATION=true
```

### Model Configuration:
The system is configured to use your `gemma3:4b` model for all generation tasks. This provides a good balance of quality and performance.

## Expected Results

After successful setup, you should be able to:

- ✅ Generate 5-10 quiz questions per minute
- ✅ Create exam papers with proper mark allocation
- ✅ Validate question quality automatically
- ✅ Store questions directly in your database
- ✅ Run batch generation for multiple topics
- ✅ Schedule automated generation

## Cost Savings

With this local setup:
- **Current cost**: $450-1,100/year (cloud APIs)
- **New cost**: ~$10-50/year (electricity only)
- **Savings**: 90%+ reduction

## Next Steps

1. **Run the basic tests** to verify everything works
2. **Generate test questions** for a few topics
3. **Review question quality** and adjust if needed
4. **Set up batch generation** for your subjects
5. **Configure automation** for regular generation

## Support

If you encounter issues:
1. Run `python scripts/test_ollama_basic.py` for diagnostics
2. Check the logs in `logs/generation/` directory
3. Verify Ollama is running: `ollama list`
4. Test basic generation: `ollama run gemma3:4b "Hello"`

The system is designed to be robust and will fall back gracefully if there are temporary issues with Ollama or the model.
