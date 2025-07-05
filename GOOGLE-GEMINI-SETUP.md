# Google Gemini API Setup Guide

This guide will help you set up Google Gemini API integration for the IGCSE Student Guide application.

## Prerequisites

- Google account
- Access to Google AI Studio

## Step-by-Step Setup

### 1. Get Your Google API Key

1. **Visit Google AI Studio**
   - Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account

2. **Create a New API Key**
   - Click "Create API Key"
   - Choose "Create API key in new project" (recommended for new users)
   - Copy the generated API key

3. **Important Security Notes**
   - Keep your API key secure and never share it publicly
   - The API key should start with `AIza`
   - Store it safely as you won't be able to see it again

### 2. Configure the Application

1. **Update Server Environment**
   - Open `server/.env` file
   - Find the line: `# GOOGLE_API_KEY=`
   - Uncomment it and replace with your actual API key:
     ```
     GOOGLE_API_KEY=your_actual_api_key_here
     ```

2. **Restart the Server**
   - Stop the current server (Ctrl+C)
   - Start it again: `npm start`
   - You should see: "✅ Google Gemini service initialized successfully"

### 3. Verify Setup

1. **Check Provider Availability**
   - Visit: http://localhost:3001/api/llm/providers
   - Google Gemini should show `"available": true`

2. **Test in the Application**
   - Go to the Admin page
   - Navigate to "Generate New Subject"
   - You should see both OpenAI and Google Gemini in the provider dropdown
   - Try generating content with Google Gemini

## Available Models

Once configured, you'll have access to these Google Gemini models:

- **gemini-1.5-flash** - Fast and efficient for most tasks
- **gemini-1.5-pro** - More capable for complex tasks
- **gemini-1.0-pro** - Legacy model for compatibility

## Troubleshooting

### Common Issues

1. **"API key not valid" Error**
   - Double-check your API key is correct
   - Ensure there are no extra spaces or characters
   - Verify the API key hasn't expired

2. **"Service not available" Message**
   - Check that the GOOGLE_API_KEY environment variable is set
   - Restart the server after making changes
   - Verify the API key format (should start with "AIza")

3. **Quota Exceeded**
   - Google Gemini has usage limits
   - Check your quota in Google AI Studio
   - Consider upgrading your plan if needed

### Getting Help

If you encounter issues:

1. Check the server console for error messages
2. Verify your API key in Google AI Studio
3. Ensure your Google account has access to Gemini API
4. Check the browser console for frontend errors

## API Limits and Pricing

- Google Gemini offers a generous free tier
- Check current pricing at: https://ai.google.dev/pricing
- Monitor your usage in Google AI Studio

## Security Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables for API keys**
3. **Regularly rotate your API keys**
4. **Monitor API usage for unexpected activity**
5. **Restrict API key usage to specific IPs if possible**

---

For more information about Google Gemini API, visit the [official documentation](https://ai.google.dev/docs).
