import { searchBookContent } from './vectorstore';
import type { SearchResult, BookChunkItem } from './types/vector';

/**
 * Retrieve relevant book content for a query using RAG
 */
export async function retrieveBookKnowledge(
    query: string,
    topK: number = 3
): Promise<SearchResult<BookChunkItem>[]> {
    return await searchBookContent(query, topK);
}

/**
 * Format book chunks into context for AI prompt (humanized, role-playing style)
 */
export function formatBookContext(results: SearchResult<BookChunkItem>[]): string {
    if (results.length === 0) {
        return '';
    }

    // Filter out reference pages and index content
    const validResults = results.filter(result => {
        const content = result.item.content.toLowerCase();
        // Skip if it looks like references or index
        return !content.includes('references') &&
            !content.match(/^\s*[A-Z][a-z]+,\s+[A-Z]\.\s+[A-Z]\./m) && // Author citations
            !content.match(/\d{3,}/); // Page numbers in references
    });

    if (validResults.length === 0) {
        return '';
    }

    // Format book content with sources for testing
    const formattedSources = validResults.map((result, index) => {
        return `
📚 Source ${index + 1} (Relevance: ${(result.score * 100).toFixed(1)}%)
Book: ${result.item.bookTitle}
${result.item.chapterTitle || 'Chapter unknown'}

Content:
${result.item.content.trim()}
`;
    }).join('\n---\n');

    return `
The following information is from the book "${validResults[0].item.bookTitle}":

${formattedSources}

---

IMPORTANT: Answer the user's question by directly referencing the book content above. 
- Start with "According to the book..." or "The book explains that..."
- Cite specific theories, concepts, and terms from the text
- Quote relevant passages when appropriate
- Mention the book title in your response
`.trim();
}

/**
 * Enhanced RAG query with book knowledge
 */
export async function queryWithBookKnowledge(
    userQuery: string,
    systemPrompt: string,
    topK: number = 3
): Promise<{ enhancedPrompt: string; sources: SearchResult<BookChunkItem>[] }> {
    const bookResults = await retrieveBookKnowledge(userQuery, topK);

    if (bookResults.length === 0) {
        return {
            enhancedPrompt: systemPrompt,
            sources: [],
        };
    }

    const bookContext = formatBookContext(bookResults);
    const enhancedPrompt = `${systemPrompt}

${bookContext}`;

    return {
        enhancedPrompt,
        sources: bookResults,
    };
}
