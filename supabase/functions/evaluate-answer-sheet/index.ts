import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in Deno's global scope
  return btoa(binary);
}

// OCR implementation using OCR.space API
async function performOcr(filePath: string, supabaseAdmin: any): Promise<string> {
  console.log(`Performing OCR for file: ${filePath}`);
  console.log(`Performing OCR for file: ${filePath}`);

  // 1. Download the file from Supabase Storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('answer_sheets')
    .download(filePath);

  if (downloadError) {
    throw new Error(`Failed to download file for OCR: ${downloadError.message}`);
  }

  const mimeType = fileData.type; // Get MIME type from the Blob
  console.log(`Detected MIME type: ${mimeType}`);

  const ocrApiKey = Deno.env.get('OCRAPE_API_KEY');
  if (!ocrApiKey) {
    throw new Error('OCRAPE_API_KEY is not set in environment variables.');
  }

  const formData = new FormData();
  formData.append('language', 'eng');

  // Handle PDF and Image files differently
  if (mimeType === 'application/pdf') {
    formData.append('file', fileData, filePath.split('/').pop());
  } else {
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Image = arrayBufferToBase64(arrayBuffer);
    const dataUri = `data:${mimeType};base64,${base64Image}`;
    console.log(`Constructed data URI (first 80 chars): ${dataUri.substring(0, 80)}`);
    formData.append('base64Image', dataUri);
  }

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      'apikey': ocrApiKey,
    },
    body: formData,
  });

  const result = await response.json();
  console.log('OCR.space API response:', JSON.stringify(result));

  if (result.IsErroredOnProcessing) {
    throw new Error(`OCR.space API Error: ${result.ErrorMessage.join(', ')}`);
  }

  if (!result.ParsedResults || result.ParsedResults.length === 0) {
    throw new Error('OCR.space API Error: No text found.');
  }

  // Combine text from all pages for PDFs
  const ocrText = result.ParsedResults
    .map((p: any) => p.ParsedText)
    .join('\n\n--- Page Break ---\n\n');

  console.log('OCR extraction complete.');
  return ocrText;
}

// Helper function to normalize text for comparison
function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .split(/\s+/) // split into words
    .filter(word => word.length > 1); // remove empty strings and single letters
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { record } = await req.json();
    const filePath = record.name;

    // 1. Find the submission record to get the exam_paper_id
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('user_exam_submissions')
      .select('id, exam_paper_id')
      .eq('file_path', filePath)
      .single();

    if (submissionError || !submission) {
      throw new Error(`Could not find submission for file: ${filePath}. ${submissionError?.message}`);
    }

    // 2. Fetch the correct answers for the exam paper
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('exam_paper_questions')
      .select('exam_questions(answer_text, marks)')
      .eq('exam_paper_id', submission.exam_paper_id);

    if (questionsError) {
      throw new Error(`Failed to fetch answers: ${questionsError.message}`);
    }

    // 3. Perform OCR (real implementation)
    const ocrText = await performOcr(filePath, supabaseAdmin);

    // 4. Score the paper (improved keyword matching)
    let totalScore = 0;
    const markScheme = questions.map(q => q.exam_questions);
    const normalizedOcrText = normalizeText(ocrText);

    for (const question of markScheme) {
      if (!question.answer_text) continue;

      const answerKeywords = normalizeText(question.answer_text);
      const matchedKeywords = answerKeywords.filter(keyword => normalizedOcrText.includes(keyword));

      // Award marks if more than 50% of keywords match
      const matchRatio = answerKeywords.length > 0 ? matchedKeywords.length / answerKeywords.length : 0;
      if (matchRatio > 0.5) {
        totalScore += question.marks;
      }
    }

    // 5. Update the submission record with the results
    const { error: updateError } = await supabaseAdmin
      .from('user_exam_submissions')
      .update({
        ocr_raw_text: ocrText,
        total_score: totalScore,
        evaluation: 'EVALUATED', // Assuming 'status' maps to the 'evaluation' column
      })
      .eq('id', submission.id);

    if (updateError) {
      throw new Error(`Failed to update submission: ${updateError.message}`);
    }

    console.log(`Successfully evaluated submission ${submission.id}. Score: ${totalScore}`);

    return new Response(JSON.stringify({ success: true, score: totalScore }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing file:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
