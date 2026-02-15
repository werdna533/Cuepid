import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
    if (openaiClient) return openaiClient;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
        console.warn("OpenAI API key not configured - RAG features will be disabled");
        return null;
    }

    openaiClient = new OpenAI({ apiKey });
    return openaiClient;
}

/**
 * Generate embedding vector for text using OpenAI API
 * @param text - Text to embed
 * @param model - Embedding model (default: text-embedding-3-small)
 * @returns Vector array (1536 dimensions for text-embedding-3-small)
 */
export async function generateEmbedding(
    text: string,
    model: string = 'text-embedding-3-small'
): Promise<number[]> {
    const client = getOpenAIClient();
    
    if (!client) {
        throw new Error("OpenAI client not available - check API key configuration");
    }

    const response = await client.embeddings.create({
        model,
        input: text,
        encoding_format: 'float',
    });

    return response.data[0].embedding;
}
