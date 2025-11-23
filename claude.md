# Claude (Anthropic) Integration Guide

## Overview

This document describes how Anthropic's Claude AI models are integrated into the IGCSE Student Guide platform. Claude is one of several supported LLM providers used to generate educational content including flashcards, quizzes, curriculum structures, and exam papers.

## Architecture

### LLM Adapter Pattern

The project uses an adapter pattern to support multiple LLM providers seamlessly. Claude integration is implemented through:

1. **LLMProvider Enum** (`src/services/llmAdapter.ts:18-25`)
   - Defines `ANTHROPIC` as a supported provider alongside OpenAI, Google, Azure, and HuggingFace

2. **AnthropicAdapter Class** (`src/services/llmAdapter.ts:278-283`)
   - Extends `BaseLLMAdapter` with Anthropic-specific configuration
   - Handles API communication through a backend proxy

3. **LLMService** (`src/services/llmService.ts`)
   - High-level service that uses adapters to generate content
   - Manages provider-specific default models and options

### Request Flow

```
Frontend Component
    ↓
LLMService.generateContent() / generateJSON()
    ↓
AnthropicAdapter (via BaseLLMAdapter)
    ↓
Backend API Proxy (/api/llm/generate or /api/llm/generate-json)
    ↓
Anthropic API
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Anthropic Claude Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: Set Claude as the default provider
REACT_APP_DEFAULT_LLM_PROVIDER=anthropic
```

### Getting Your API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (format: `sk-ant-...`)

## Supported Models

The project uses Claude 3 Sonnet as the default model for Anthropic:

```typescript
// From src/services/llmService.ts:19
[LLMProvider.ANTHROPIC]: 'claude-3-sonnet'
```

### Available Claude Models

You can use any of Anthropic's Claude models:

- **Claude 3.5 Sonnet** (`claude-3-5-sonnet-20241022`) - Latest, most capable
- **Claude 3 Opus** (`claude-3-opus-20240229`) - Most powerful, best for complex tasks
- **Claude 3 Sonnet** (`claude-3-sonnet-20240229`) - Balanced performance and cost
- **Claude 3 Haiku** (`claude-3-haiku-20240307`) - Fastest, most cost-effective

## Usage

### Basic Text Generation

```typescript
import { llmService, LLMProvider } from './services/llmService';

const content = await llmService.generateContent(
  "Explain photosynthesis for IGCSE students",
  {
    provider: LLMProvider.ANTHROPIC,
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 1000
  }
);
```

### JSON Generation

```typescript
import { llmService, LLMProvider } from './services/llmService';

interface FlashCard {
  question: string;
  answer: string;
  difficulty: string;
}

const flashcard = await llmService.generateJSON<FlashCard>(
  "Generate a flashcard about the water cycle",
  {
    provider: LLMProvider.ANTHROPIC,
    model: 'claude-3-sonnet',
    temperature: 0.7,
    maxTokens: 500
  }
);
```

### Curriculum Generation

```typescript
import { llmService, LLMProvider } from './services/llmService';

const curriculum = await llmService.generateCurriculum(
  'Chemistry',
  'Grade 9',
  'Cambridge IGCSE',
  'Extended',
  {
    provider: LLMProvider.ANTHROPIC,
    model: 'claude-3-sonnet',
    temperature: 0.7
  }
);
```

### Using with Authentication

When making requests from authenticated contexts, include the auth token:

```typescript
import { useSupabaseClient } from '@supabase/auth-helpers-react';

const supabase = useSupabaseClient();
const { data: { session } } = await supabase.auth.getSession();

const content = await llmService.generateContent(
  "Your prompt here",
  {
    provider: LLMProvider.ANTHROPIC,
    authToken: session?.access_token
  }
);
```

## Best Practices

### Model Selection

1. **For Complex Analysis**: Use Claude 3 Opus or Claude 3.5 Sonnet
   - Curriculum generation
   - Detailed explanations
   - Multi-step reasoning

2. **For General Content**: Use Claude 3 Sonnet (default)
   - Flashcard generation
   - Quiz questions
   - Topic summaries

3. **For Simple Tasks**: Use Claude 3 Haiku
   - Quick definitions
   - Simple Q&A
   - High-volume generation

### Temperature Settings

- **0.3-0.5**: Factual content, definitions, curriculum structures
- **0.7**: General content generation (default)
- **0.8-1.0**: Creative content, varied question types

### Token Limits

- **Flashcards**: 500-1000 tokens
- **Quiz Questions**: 1000-2000 tokens
- **Curriculum**: 2000-4000 tokens
- **Exam Papers**: 3000-5000 tokens

## Cost Optimization

### Token Pricing (as of 2024)

Claude 3 Sonnet pricing:
- Input: $3 per million tokens
- Output: $15 per million tokens

### Cost-Saving Strategies

1. **Use Appropriate Models**
   - Don't use Claude 3 Opus for simple tasks
   - Prefer Haiku for high-volume, simple generations

2. **Optimize Prompts**
   - Be concise but clear
   - Avoid unnecessary context repetition

3. **Set Token Limits**
   - Use `maxTokens` to prevent over-generation
   - Tailor limits to content type

4. **Implement Caching** (Future Enhancement)
   - Cache frequently requested content
   - Reuse generated curriculum structures

### Monitoring Costs

Enable cost monitoring in `.env`:

```bash
ENABLE_COST_MONITORING=true
COST_ALERT_THRESHOLD=50
```

## Error Handling

The adapter includes comprehensive error handling:

### Common Errors

1. **401 Unauthorized**
   ```
   Error: Authentication failed. Please log in again.
   ```
   Solution: Check your `ANTHROPIC_API_KEY` is valid

2. **403 Forbidden**
   ```
   Error: You do not have permission to access this resource.
   ```
   Solution: Ensure admin privileges or correct auth token

3. **400 Bad Request**
   ```
   Error: Bad request: Invalid request parameters
   ```
   Solution: Verify prompt format and options

4. **Rate Limiting**
   - Anthropic enforces rate limits based on your tier
   - Implement retry logic with exponential backoff

### Example Error Handling

```typescript
try {
  const content = await llmService.generateContent(prompt, {
    provider: LLMProvider.ANTHROPIC
  });
} catch (error) {
  if (error.message.includes('Authentication failed')) {
    // Handle auth error
  } else if (error.message.includes('rate limit')) {
    // Implement retry logic
  } else {
    // Handle other errors
    console.error('LLM error:', error);
  }
}
```

## Backend Configuration

### Server-Side Setup

The backend API proxy handles Claude requests. Ensure your server environment has:

```bash
# In server/.env or root .env
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### API Endpoints

The adapter uses these backend endpoints:

- `POST /api/llm/generate` - Text generation
- `POST /api/llm/generate-json` - JSON generation
- `POST /api/llm/generate-curriculum` - Curriculum generation

## Testing

### Manual Testing

Use the test scripts to verify Claude integration:

```bash
# Test basic generation
node test-api-integration.js

# Test simplified generation
node test-simplified-generation.js
```

### Example Test

```javascript
const { llmService, LLMProvider } = require('./src/services/llmService');

async function testClaudeIntegration() {
  try {
    const result = await llmService.generateContent(
      "What is Newton's First Law?",
      {
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-3-sonnet',
        temperature: 0.5,
        maxTokens: 200
      }
    );

    console.log('Claude Response:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testClaudeIntegration();
```

## Comparison with Other Providers

| Feature | Claude 3 Sonnet | GPT-4o | Gemini 1.5 Flash |
|---------|----------------|---------|------------------|
| **Context Window** | 200K tokens | 128K tokens | 1M tokens |
| **Speed** | Fast | Fast | Very Fast |
| **Cost (Input)** | $3/M tokens | $5/M tokens | $0.35/M tokens |
| **Cost (Output)** | $15/M tokens | $15/M tokens | $1.05/M tokens |
| **Best For** | Balanced tasks | Complex reasoning | High-volume |

### When to Choose Claude

- **Superior reasoning**: Complex educational content generation
- **Safety**: Built-in safety features for student-facing content
- **Context handling**: Large context window for curriculum generation
- **Instruction following**: Excellent at following structured prompts

## Troubleshooting

### Issue: "Provider not supported"

Check that `ANTHROPIC` is properly imported:
```typescript
import { LLMProvider } from './services/llmAdapter';
```

### Issue: API key not working

1. Verify the key format starts with `sk-ant-`
2. Check the key hasn't expired in Anthropic Console
3. Ensure the key has proper permissions

### Issue: Slow responses

1. Reduce `maxTokens` if possible
2. Consider using Claude 3 Haiku for faster responses
3. Check your network connection

### Issue: JSON parsing errors

Ensure prompts explicitly request JSON format:
```typescript
const prompt = `Generate a flashcard about X.

Provide your response as a valid JSON object with this structure:
{
  "question": "...",
  "answer": "...",
  "difficulty": "easy|medium|hard"
}`;
```

## Future Enhancements

- [ ] Implement Claude's prompt caching for cost reduction
- [ ] Add streaming support for real-time content generation
- [ ] Integrate Claude's function calling capabilities
- [ ] Add support for Claude's vision capabilities for image analysis
- [ ] Implement A/B testing between providers

## Resources

- [Anthropic Documentation](https://docs.anthropic.com/)
- [Claude API Reference](https://docs.anthropic.com/claude/reference/)
- [Anthropic Console](https://console.anthropic.com/)
- [Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)

## Support

For issues specific to this integration:
1. Check this documentation
2. Review error logs in the console
3. Test with other providers to isolate the issue
4. Verify API key and configuration

For Anthropic API issues:
- [Anthropic Support](https://support.anthropic.com/)
- [API Status](https://status.anthropic.com/)

## License

This integration follows the same MIT license as the main project.
