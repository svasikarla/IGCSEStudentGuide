# LLM Integration for IGCSE Student Guide

This document provides an overview of the Large Language Model (LLM) integration in the IGCSE Student Guide application, including the secure backend proxy, adapter interfaces for multiple LLM providers, and testing framework.

## Architecture Overview

The LLM integration consists of the following components:

1. **Backend Proxy Server**: A secure Express.js server that handles API calls to LLM providers, keeping API keys secure.
2. **LLM Service**: A frontend service that interacts with the backend proxy.
3. **Adapter Interface**: A flexible adapter pattern for supporting multiple LLM providers.
4. **Testing Framework**: Tools to compare output quality across different LLM providers.
5. **Admin UI**: Interface for generating educational content and testing LLM providers.

## Setup Instructions

### Backend Proxy Server

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your API keys:
   ```
   PORT=3001
   OPENAI_API_KEY=your_openai_api_key_here
   GOOGLE_API_KEY=your_google_api_key_here
   ```

4. Start the server:
   ```
   npm start
   ```

### Frontend Configuration

1. Ensure your frontend `.env` file includes the API base URL:
   ```
   REACT_APP_API_BASE_URL=http://localhost:3001/api
   ```

2. The OpenAI API key is no longer needed in the frontend `.env` file as it's now securely stored in the backend.

## Available LLM Providers

The application supports the following LLM providers through the adapter interface:

- **OpenAI** (default) - GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-4, GPT-3.5-turbo
- **Google Gemini** - Gemini-1.5-flash, Gemini-1.5-pro, Gemini-1.0-pro
- Azure OpenAI Service (planned)
- Anthropic Claude (planned)
- Custom (for implementing additional providers)

### Provider Selection

All admin forms now include a dropdown to select the LLM provider and model:
- **Provider Selection**: Choose between OpenAI and Google Gemini
- **Model Selection**: Select specific models available for the chosen provider
- **Real-time Availability**: The interface shows which providers are currently available based on API key configuration
- **Universal Support**: Available in all content generation forms:
  - Subject Generation
  - Topic Generation
  - Flashcard Generation
  - Quiz Generation

## API Endpoints

### Backend Proxy Server

- `GET /api/health`: Health check endpoint
- `POST /api/llm/generate`: Generate text content
- `POST /api/llm/generate-json`: Generate JSON-formatted content
- `POST /api/llm/:provider/generate`: Generic provider endpoint for future expansion

## Testing Framework

The application includes a testing framework to compare output quality across different LLM providers:

1. Access the testing interface from the Admin page by clicking on the "Test LLM Providers" tab.
2. Select the providers you want to compare.
3. Run the tests to see detailed results and comparisons.

## Content Generation

The Admin UI provides interfaces for generating:

1. Subjects
2. Topics
3. Flashcards
4. Quizzes

Each generation form includes:
- Input fields for customizing the generation prompt
- Preview of generated content
- Ability to edit before saving
- Save functionality to store in the database

## Security Considerations

- API keys are stored securely on the backend server
- The backend proxy prevents exposure of API keys to client browsers
- Consider implementing authentication for the backend API in production
- Set up rate limiting for production deployment

## Future Enhancements

- Implement caching for commonly requested content
- Add batch generation capabilities
- Integrate educator review workflows
- Implement more sophisticated prompt engineering
- Add support for additional LLM providers

## Troubleshooting

- If you encounter CORS issues, ensure the backend server has proper CORS configuration
- Check that the API base URL is correctly set in the frontend `.env` file
- Verify that the backend server is running before attempting to use LLM features
- Check the browser console and server logs for detailed error messages
