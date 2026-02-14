import { LocalIndex } from 'vectra';
import path from 'path';
import { generateEmbedding } from './openai';
import type { VectorItem, BookChunkItem, SearchResult } from './types/vector';

const VECTOR_DIMENSION = parseInt(process.env.VECTOR_DIMENSION || '1536');
const VECTOR_STORAGE_PATH = process.env.VECTOR_STORAGE_PATH || './data/vectors';

let conversationIndex: LocalIndex | null = null;
let bookIndex: LocalIndex | null = null;

/**
 * Initialize vector index for conversations
 */
export async function getConversationIndex(): Promise<LocalIndex> {
    if (conversationIndex) return conversationIndex;

    const indexPath = path.join(process.cwd(), VECTOR_STORAGE_PATH, 'conversations');
    conversationIndex = new LocalIndex(indexPath);

    if (!(await conversationIndex.isIndexCreated())) {
        await conversationIndex.createIndex();
    }

    return conversationIndex;
}

/**
 * Initialize vector index for book chunks
 */
export async function getBookIndex(): Promise<LocalIndex> {
    if (bookIndex) return bookIndex;

    const indexPath = path.join(process.cwd(), VECTOR_STORAGE_PATH, 'books');
    bookIndex = new LocalIndex(indexPath);

    if (!(await bookIndex.isIndexCreated())) {
        await bookIndex.createIndex();
    }

    return bookIndex;
}

/**
 * Store conversation summary with vector
 */
export async function storeConversationVector(
    conversationId: string,
    userId: string,
    summary: string,
    metadata?: Partial<VectorItem>
): Promise<void> {
    const index = await getConversationIndex();
    const vector = await generateEmbedding(summary);

    const item: VectorItem = {
        conversationId,
        userId,
        summary,
        timestamp: new Date().toISOString(),
        ...metadata,
    };

    await index.insertItem({
        vector,
        metadata: item,
    });
}

/**
 * Store book chunk with vector
 */
export async function storeBookChunk(
    bookTitle: string,
    content: string,
    metadata?: Partial<BookChunkItem>
): Promise<void> {
    const index = await getBookIndex();
    const vector = await generateEmbedding(content);

    const item: BookChunkItem = {
        bookTitle,
        content,
        timestamp: new Date().toISOString(),
        ...metadata,
    };

    await index.insertItem({
        vector,
        metadata: item,
    });
}

/**
 * Semantic search in conversations
 */
export async function searchConversations(
    query: string,
    limit: number = 5,
    userId?: string
): Promise<SearchResult<VectorItem>[]> {
    const index = await getConversationIndex();
    const queryVector = await generateEmbedding(query);

    const results = await index.queryItems(queryVector, limit * 2); // Get more for filtering

    let filteredResults = results;
    if (userId) {
        filteredResults = results.filter(
            (r) => (r.item.metadata as VectorItem).userId === userId
        );
    }

    return filteredResults.slice(0, limit).map((r) => ({
        item: r.item.metadata as VectorItem,
        score: r.score,
    }));
}

/**
 * Semantic search in book content
 */
export async function searchBookContent(
    query: string,
    limit: number = 3
): Promise<SearchResult<BookChunkItem>[]> {
    const index = await getBookIndex();
    const queryVector = await generateEmbedding(query);

    const results = await index.queryItems(queryVector, limit);

    return results.map((r) => ({
        item: r.item.metadata as BookChunkItem,
        score: r.score,
    }));
}

/**
 * Get statistics about vector stores
 */
export async function getVectorStats() {
    const conversationIdx = await getConversationIndex();
    const bookIdx = await getBookIndex();

    const conversationItems = await conversationIdx.listItems();
    const bookItems = await bookIdx.listItems();

    return {
        conversations: conversationItems.length,
        bookChunks: bookItems.length,
        totalVectors: conversationItems.length + bookItems.length,
        dimension: VECTOR_DIMENSION,
        storagePath: VECTOR_STORAGE_PATH,
    };
}
