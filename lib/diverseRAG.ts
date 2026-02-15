import { searchBookContent } from './vectorstore';
import type { SearchResult, BookChunkItem } from './types/vector';

/**
 * Retrieve knowledge from multiple books with diversity
 */
export async function retrieveDiverseBookKnowledge(
    query: string,
    topK: number = 10
): Promise<SearchResult<BookChunkItem>[]> {
    // Get more results than needed
    const results = await searchBookContent(query, topK * 2);

    // Group by book title
    const bookGroups = new Map<string, SearchResult<BookChunkItem>[]>();
    for (const result of results) {
        const bookTitle = result.item.bookTitle;
        if (!bookGroups.has(bookTitle)) {
            bookGroups.set(bookTitle, []);
        }
        bookGroups.get(bookTitle)!.push(result);
    }

    // Distribute evenly across books
    const diverseResults: SearchResult<BookChunkItem>[] = [];
    const books = Array.from(bookGroups.keys());
    let bookIndex = 0;

    while (diverseResults.length < topK && diverseResults.length < results.length) {
        const currentBook = books[bookIndex % books.length];
        const bookResults = bookGroups.get(currentBook)!;

        if (bookResults.length > 0) {
            diverseResults.push(bookResults.shift()!);
        }

        // Remove empty book groups
        if (bookResults.length === 0) {
            books.splice(bookIndex % books.length, 1);
            if (books.length === 0) break;
        } else {
            bookIndex++;
        }
    }

    return diverseResults;
}

async function testDiversity() {
    console.log('🧪 Testing Diverse RAG Retrieval\\n');
    console.log('='.repeat(60));

    const query = 'attachment styles relationships commitment';
    console.log(`\\n📝 Query: "${query}"\\n`);

    try {
        const results = await retrieveDiverseBookKnowledge(query, 10);

        // Count by book
        const bookCounts = new Map<string, number>();
        results.forEach(r => {
            const count = bookCounts.get(r.item.bookTitle) || 0;
            bookCounts.set(r.item.bookTitle, count + 1);
        });

        console.log(`✅ Retrieved ${results.length} chunks from ${bookCounts.size} books\\n`);
        console.log('Distribution:');
        bookCounts.forEach((count, book) => {
            console.log(`  📚 ${book}: ${count} chunks`);
        });

        console.log('\\nDetailed results:');
        results.forEach((result, index) => {
            console.log(`\\n${index + 1}. ${result.item.bookTitle}`);
            console.log(`   Chapter: ${result.item.chapterTitle || 'Unknown'}`);
            console.log(`   Similarity: ${(result.score * 100).toFixed(1)}%`);
            console.log(`   Preview: ${result.item.content.substring(0, 150).replace(/\\n/g, ' ')}...`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }

    console.log('\\n' + '='.repeat(60));
}

// Run if called directly
if (require.main === module) {
    testDiversity().catch(console.error);
}

export { testDiversity };
