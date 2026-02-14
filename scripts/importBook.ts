#!/usr/bin/env tsx
/**
 * Import book into vector database
 * Usage: npx tsx scripts/importBook.ts <path-to-book> <book-title>
 * 
 * Example:
 *   npx tsx scripts/importBook.ts ./data/books/intimate_relationships.docx "Intimate Relationships"
 */

import { processBookFile } from '../lib/bookProcessor';
import { storeBookChunk, getVectorStats } from '../lib/vectorstore';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: npx tsx scripts/importBook.ts <file-path> <book-title>');
        console.error('Example: npx tsx scripts/importBook.ts ./data/books/book.docx "My Book"');
        process.exit(1);
    }

    const [filePath, bookTitle] = args;
    const absolutePath = path.resolve(filePath);

    console.log('📚 Starting book import...');
    console.log(`   File: ${absolutePath}`);
    console.log(`   Title: ${bookTitle}`);
    console.log('');

    try {
        // Process book file
        console.log('📖 Processing book file...');
        const chunks = await processBookFile(absolutePath, bookTitle);
        console.log(`   ✓ Extracted ${chunks.length} chunks`);
        console.log('');

        // Import to vector database
        console.log('🔄 Importing to vector database...');
        let imported = 0;

        for (const chunk of chunks) {
            await storeBookChunk(chunk.bookTitle, chunk.content, {
                chapterTitle: chunk.chapterTitle,
            });

            imported++;
            if (imported % 10 === 0) {
                process.stdout.write(`   Progress: ${imported}/${chunks.length}\r`);
            }
        }

        console.log(`   ✓ Imported ${imported} chunks`);
        console.log('');

        // Show statistics
        const stats = await getVectorStats();
        console.log('📊 Vector Database Statistics:');
        console.log(`   Conversations: ${stats.conversations}`);
        console.log(`   Book chunks: ${stats.bookChunks}`);
        console.log(`   Total vectors: ${stats.totalVectors}`);
        console.log(`   Dimension: ${stats.dimension}`);
        console.log('');

        console.log('✅ Book import completed successfully!');

    } catch (error) {
        console.error('❌ Error importing book:', error);
        process.exit(1);
    }
}

main();
