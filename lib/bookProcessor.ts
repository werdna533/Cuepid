import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

export interface BookChunk {
    content: string;
    chapterTitle?: string;
    pageNumber?: number;
}

/**
 * Extract text from PDF file
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
    const require = createRequire(import.meta.url);
    const pdfParse = require('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
}

/**
 * Extract text from DOCX file
 */
export async function extractTextFromDocx(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
}

/**
 * Split text into chunks for vector embedding
 * Splits by paragraphs and combines into ~500 word chunks
 */
export function chunkText(
    text: string,
    chunkSize: number = 500,
    overlap: number = 50
): BookChunk[] {
    // Split by double newlines (paragraphs)
    const paragraphs = text
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    const chunks: BookChunk[] = [];
    let currentChunk: string[] = [];
    let currentWordCount = 0;

    for (const paragraph of paragraphs) {
        const words = paragraph.split(/\s+/);
        const wordCount = words.length;

        // If adding this paragraph exceeds chunk size, save current chunk
        if (currentWordCount + wordCount > chunkSize && currentChunk.length > 0) {
            chunks.push({
                content: currentChunk.join('\n\n'),
            });

            // Start new chunk with overlap
            const overlapWords = Math.min(overlap, currentWordCount);
            const lastParagraph = currentChunk[currentChunk.length - 1];
            const overlapText = lastParagraph.split(/\s+/).slice(-overlapWords).join(' ');

            currentChunk = [overlapText, paragraph];
            currentWordCount = overlapWords + wordCount;
        } else {
            currentChunk.push(paragraph);
            currentWordCount += wordCount;
        }
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
        chunks.push({
            content: currentChunk.join('\n\n'),
        });
    }

    return chunks;
}

/**
 * Detect chapter titles (simple heuristic)
 */
export function detectChapters(text: string): { title: string; startIndex: number }[] {
    const lines = text.split('\n');
    const chapters: { title: string; startIndex: number }[] = [];

    const chapterPatterns = [
        /^Chapter\s+\d+/i,
        /^第\s*[一二三四五六七八九十\d]+\s*章/i,
        /^CHAPTER\s+[IVXLCDM]+/i,
    ];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (chapterPatterns.some((pattern) => pattern.test(trimmed))) {
            chapters.push({
                title: trimmed,
                startIndex: index,
            });
        }
    });

    return chapters;
}

/**
 * Process book file and return chunks with metadata
 */
export async function processBookFile(
    filePath: string,
    bookTitle: string
): Promise<Array<BookChunk & { bookTitle: string }>> {
    const ext = path.extname(filePath).toLowerCase();

    let text: string;
    if (ext === '.docx') {
        text = await extractTextFromDocx(filePath);
    } else if (ext === '.pdf') {
        text = await extractTextFromPdf(filePath);
    } else if (ext === '.txt' || ext === '.md') {
        text = await fs.readFile(filePath, 'utf-8');
    } else {
        throw new Error(`Unsupported file format: ${ext}`);
    }

    // Clean up text
    text = text
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
        .trim();

    const chunks = chunkText(text);
    const chapters = detectChapters(text);

    // Add chapter information to chunks
    return chunks.map((chunk, index) => {
        // Find which chapter this chunk belongs to
        const chapterInfo = chapters.find((ch, chIndex) => {
            const nextChapter = chapters[chIndex + 1];
            return !nextChapter || index < nextChapter.startIndex;
        });

        return {
            ...chunk,
            bookTitle,
            chapterTitle: chapterInfo?.title,
        };
    });
}
