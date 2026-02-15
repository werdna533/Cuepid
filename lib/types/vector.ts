/**
 * Item stored in Vectra vector database
 */
export interface VectorItem {
    conversationId: string;
    userId: string;
    summary: string;
    scenario?: string;
    difficulty?: string;
    timestamp: string;
}

/**
 * Book chunk stored in vector database
 */
export interface BookChunkItem {
    bookTitle: string;
    chapterTitle?: string;
    pageNumber?: number;
    content: string;
    timestamp: string;
}

/**
 * Metadata for vector search results
 */
export interface VectorMetadata {
    id: string;
    score: number;
    [key: string]: unknown;
}

/**
 * Search result with vector similarity score
 */
export interface SearchResult<T> {
    item: T;
    score: number;
}
