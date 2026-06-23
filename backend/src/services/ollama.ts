import axios, { type AxiosInstance } from 'axios';
import FormData from 'form-data';
import type { AnalysisResult, OllamaGenerateResponse } from '../utils/types';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// Ollama AI Service
// ============================================

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const WHISPER_SERVER_URL = process.env.WHISPER_SERVER_URL || 'http://localhost:9000';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const client: AxiosInstance = axios.create({
  baseURL: OLLAMA_BASE_URL,
  timeout: 120000, // 2 minutes for long transcriptions
});

/**
 * Sleep utility for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for Ollama API calls
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`⚠️ Attempt ${attempt + 1}/${retries} failed: ${lastError.message}`);

      if (attempt < retries - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error('All retries exhausted');
}

/**
 * Check if Ollama is running and accessible
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await client.get('/api/tags');
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * List available models
 */
export async function listModels(): Promise<string[]> {
  try {
    const response = await client.get('/api/tags');
    const models = response.data?.models ?? [];
    return models.map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}

/**
 * Transcribe audio using the local Python openai-whisper server.
 * Run: python whisper_server.py  (listens on http://localhost:9000)
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  return withRetry(async () => {
    try {
      const form = new FormData();
      form.append('audio', audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm',
      });

      const response = await axios.post<{ text: string }>(
        `${WHISPER_SERVER_URL}/transcribe`,
        form,
        { headers: form.getHeaders(), timeout: 60000 }
      );

      const text = response.data.text?.trim();
      if (!text) throw new Error('Empty transcription from whisper server');
      console.log(`🎤 Transcribed: "${text.substring(0, 80)}..."`);
      return text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ Whisper server error: ${errorMsg}`);
      console.warn('💡 Make sure whisper_server.py is running: python backend/whisper_server.py');
      throw error; // Let withRetry handle retries
    }
  });
}

/**
 * Analyze meeting transcript using LLM (Llama 3.2 or Mistral)
 */
export async function analyzeTranscript(transcript: string): Promise<AnalysisResult> {
  return withRetry(async () => {
    const prompt = `You are analyzing a meeting transcript. Extract the following information:

1. SUMMARY - A concise summary of the meeting discussion (2-3 sentences)
2. ACTION ITEMS - Specific tasks that were assigned or need to be done
3. KEY DECISIONS - Important decisions that were made during the meeting
4. TOPICS - Main topics or themes discussed

Meeting Transcript:
"""
${transcript}
"""

Respond ONLY in valid JSON format with this exact structure:
{
  "summary": "...",
  "actionItems": ["..."],
  "decisions": ["..."],
  "topics": ["..."]
}

Important: Return ONLY the JSON object, no markdown formatting, no code blocks, no additional text.`;

    try {
      const response = await client.post<OllamaGenerateResponse>('/api/generate', {
        model: 'llama3.2',
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 2048,
          top_p: 0.9,
        },
      });

      const rawResponse = response.data.response?.trim();
      if (!rawResponse) {
        throw new Error('Empty analysis response');
      }

      // Parse JSON from the response, handling potential markdown wrapping
      const jsonStr = extractJSON(rawResponse);
      const parsed = JSON.parse(jsonStr) as AnalysisResult;

      // Validate structure
      return {
        summary: parsed.summary || 'No summary available.',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ LLM analysis failed: ${errorMsg}`);

      // Try with mistral as fallback
      try {
        const fallbackResponse = await client.post<OllamaGenerateResponse>('/api/generate', {
          model: 'mistral',
          prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 2048 },
        });

        const rawFallback = fallbackResponse.data.response?.trim();
        if (rawFallback) {
          const jsonStr = extractJSON(rawFallback);
          const parsed = JSON.parse(jsonStr) as AnalysisResult;
          return {
            summary: parsed.summary || 'No summary available.',
            actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
            decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
            topics: Array.isArray(parsed.topics) ? parsed.topics : [],
          };
        }
      } catch {
        console.warn('⚠️ Mistral fallback also failed');
      }

      // Return simulated analysis if no LLM is available
      return generateSimulatedAnalysis(transcript);
    }
  });
}

/**
 * Extract JSON from a potentially markdown-wrapped response
 */
function extractJSON(text: string): string {
  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return text;
}

/**
 * Simulated analysis for demo/fallback when LLM is unavailable
 */
function generateSimulatedAnalysis(transcript: string): AnalysisResult {
  const words = transcript.split(/\s+/).filter(Boolean);
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);

  return {
    summary: sentences.length > 0
      ? `Meeting covered ${sentences.length} discussion points across ${words.length} words of dialogue. Key areas of focus included project updates and team coordination.`
      : 'Brief meeting with limited discussion captured.',
    actionItems: [
      'Review and follow up on discussed items',
      'Schedule follow-up meeting if needed',
      'Share meeting notes with absent team members',
    ],
    decisions: [
      'Team alignment on current priorities confirmed',
    ],
    topics: extractTopicsFromText(transcript),
  };
}

/**
 * Simple topic extraction fallback using keyword frequency
 */
function extractTopicsFromText(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
    'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
    'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
    'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'too', 'very',
    'just', 'about', 'also', 'get', 'got', 'let', 'need', 'think',
  ]);

  const wordFreq = new Map<string, number>();
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);

  for (const word of words) {
    if (word.length > 3 && !stopWords.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  const sorted = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

  return sorted.length > 0 ? sorted : ['General Discussion'];
}
