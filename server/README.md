# IGCSE Student Guide - Backend Proxy Server

This is a simple Express.js server that acts as a secure proxy for LLM API calls in the IGCSE Student Guide application. It prevents API keys from being exposed on the client side.

## Features

- Secure OpenAI API key management
- Text generation endpoint
- JSON generation endpoint with proper formatting
- Extensible architecture for adding other LLM providers
- CORS support for frontend integration

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with your OpenAI API key:
   ```
   PORT=3001
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. Start the server:
   ```
   npm start
   ```

   For development with auto-restart:
   ```
   npm run dev
   ```

## API Endpoints

### Health Check
```
GET /api/health
```

### Generate Text
```
POST /api/llm/generate
```
Request body:
```json
{
  "prompt": "Your prompt text here",
  "model": "gpt-3.5-turbo", // optional
  "temperature": 0.7, // optional
  "max_tokens": 500 // optional
}
```

### Generate JSON
```
POST /api/llm/generate-json
```
Request body:
```json
{
  "prompt": "Your prompt text here",
  "model": "gpt-3.5-turbo-0125", // optional
  "temperature": 0.7, // optional
  "max_tokens": 1000 // optional
}
```

### Generic Provider Endpoint (for future expansion)
```
POST /api/llm/:provider/generate
```
Currently supports:
- `openai` as provider

## Security Considerations

- Never commit your `.env` file with API keys
- Set up proper authentication for production use
- Consider rate limiting for production deployment
