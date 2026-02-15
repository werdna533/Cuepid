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

    // Filter out reference pages, citations, and low-quality content
    const validResults = results.filter(result => {
        const content = result.item.content.toLowerCase();
        const originalContent = result.item.content;

        // Skip if it looks like references or bibliography
        if (content.includes('references') || content.includes('bibliography')) return false;

        // Skip author citations format (e.g., "Smith, J. A.")
        if (content.match(/^\s*[A-Z][a-z]+,\s+[A-Z]\.\s+[A-Z]\./m)) return false;

        // Skip if too many page numbers (likely index or references)
        const pageNumbers = content.match(/\d{3,}/g);
        if (pageNumbers && pageNumbers.length > 3) return false;

        // Skip copyright and legal notices
        if (content.includes('copyright') || content.includes('©')) return false;

        // Skip if content is too short (likely a fragment)
        if (originalContent.length < 200) return false;

        // Skip if it mentions specific citation patterns
        if (content.includes('colleagues created') || content.includes('simulated prison')) return false;
        if (content.includes('points to the second conclusion')) return false;

        // Skip if it's mostly names and dates (reference style)
        const namePattern = /[A-Z][a-z]+,\s+[A-Z]\./g;
        const nameMatches = content.match(namePattern);
        if (nameMatches && nameMatches.length > 3) return false;

        return true;
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
