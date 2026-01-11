/**
 * Embedding Generation using Together.ai
 * Provides functions to generate vector embeddings for semantic search
 */

import { DEFAULT_MEMORY_CONFIG } from './types.ts';

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text");
  }

  if (!TOGETHER_API_KEY) {
    throw new Error("TOGETHER_API_KEY not configured");
  }

  // Truncate to max token length (approximately 8000 chars)
  const truncatedText = text.substring(0, 8000);

  try {
    const response = await fetch("https://api.together.xyz/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MEMORY_CONFIG.embeddingModel,
        input: truncatedText,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Embedding API error:", error);
      throw new Error(`Embedding generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 * More efficient than generating one at a time
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  if (!TOGETHER_API_KEY) {
    throw new Error("TOGETHER_API_KEY not configured");
  }

  // Truncate each text and filter empty ones
  const validTexts = texts
    .map(t => t.trim().substring(0, 8000))
    .filter(t => t.length > 0);

  if (validTexts.length === 0) {
    return [];
  }

  try {
    const response = await fetch("https://api.together.xyz/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MEMORY_CONFIG.embeddingModel,
        input: validTexts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Batch embedding API error:", error);
      throw new Error(`Batch embedding generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.data.map((item: { embedding: number[] }) => item.embedding);
  } catch (error) {
    console.error("Failed to generate batch embeddings:", error);
    throw error;
  }
}

/**
 * Format embedding array as Postgres vector string
 * Required for inserting into pgvector columns
 */
export function embeddingToPostgresVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/**
 * Parse Postgres vector string back to number array
 * Used when reading embeddings from database
 */
export function postgresVectorToEmbedding(vectorStr: string): number[] {
  // Remove brackets and parse
  const cleaned = vectorStr.replace(/^\[|\]$/g, '');
  return cleaned.split(',').map(n => parseFloat(n));
}

/**
 * Calculate cosine similarity between two embeddings
 * Useful for client-side similarity calculations
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have same dimensions");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate embedding with retry logic
 * Handles transient failures gracefully
 */
export async function generateEmbeddingWithRetry(
  text: string,
  maxRetries = 3
): Promise<number[] | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateEmbedding(text);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Embedding attempt ${attempt + 1} failed:`, error);

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  console.error("All embedding attempts failed:", lastError);
  return null;
}
