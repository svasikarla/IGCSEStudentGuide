# Frontend Connection Fix Guide

## 🔍 Issue Diagnosis

Your React frontend cannot connect to the backend because:

1. **Authentication Required**: The `/api/llm/generate-json` endpoint requires authentication
2. **Missing Auth Token**: Your frontend is not providing the required Bearer token
3. **Google API Overload**: Gemini API is currently experiencing high load (503 errors)

## ✅ Backend Status
- ✅ Server running on port 3001
- ✅ Gemini service configured and available  
- ✅ Health endpoints responding
- ✅ Simplified generation endpoints working

## 🔧 Solution Options

### Option 1: Use Simplified Generation Endpoints (Recommended)

**Advantages:**
- No authentication required
- Designed for educational content generation
- Cost-optimized
- Already working

**Implementation:**
Replace your current API calls from:
```
POST /api/llm/generate-json
```

To:
```
POST /api/simplified-generation/quiz
POST /api/simplified-generation/flashcards  
POST /api/simplified-generation/exam
```

**Example Request:**
```javascript
const response = await fetch('http://localhost:3001/api/simplified-generation/quiz', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subject: 'Mathematics',
    topicTitle: 'Number and Algebra',
    syllabusCode: 'IGCSE',
    gradeLevel: 'Grade 9',
    questionCount: 5,
    difficultyLevel: 'medium'
  })
});
```

### Option 2: Add Authentication to Current Endpoints

**Implementation:**
1. Ensure user is logged in via Supabase
2. Get the access token from the session
3. Add Authorization header to requests

**Example:**
```javascript
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch('http://localhost:3001/api/llm/generate-json', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    prompt: 'Your prompt here',
    provider: 'google',
    model: 'gemini-1.5-flash'
  })
});
```

### Option 3: Remove Authentication Requirement (Development Only)

**For testing purposes only**, you can temporarily remove authentication:

1. Edit `server/routes/llm.js`
2. Comment out line 99: `// router.use(verifyToken, requireAdmin);`
3. Restart the server

**⚠️ Warning:** Only use this for development testing!

## 🚀 Immediate Fix for Testing

To test your connection right now:

1. **Test the simplified endpoint:**
```bash
curl -X POST http://localhost:3001/api/simplified-generation/quiz \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Mathematics",
    "topicTitle": "Number and Algebra", 
    "syllabusCode": "IGCSE",
    "gradeLevel": "Grade 9",
    "questionCount": 3,
    "difficultyLevel": "medium"
  }'
```

2. **Check if Gemini API is available:**
```bash
curl http://localhost:3001/api/simplified-generation/health
```

## 🔄 Next Steps

1. **Immediate**: Use simplified generation endpoints for testing
2. **Short-term**: Implement proper authentication in frontend
3. **Long-term**: Consider implementing OpenAI service as backup for when Gemini is overloaded

## 📞 Support

If you continue to see "ERR_CONNECTION_REFUSED" errors:
1. Verify the backend server is running: `curl http://localhost:3001/api/health`
2. Check if port 3001 is blocked by firewall
3. Ensure no other service is using port 3001
