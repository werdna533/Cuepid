import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/openai';

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: 'Text is required and must be a string' },
                { status: 400 }
            );
        }

        const embedding = await generateEmbedding(text);

        return NextResponse.json({
            embedding,
            dimension: embedding.length,
            model: 'text-embedding-3-small',
        });
    } catch (error: any) {
        console.error('Error generating embedding:', error);
        return NextResponse.json(
            {
                error: error.message || 'Failed to generate embedding',
            },
            { status: 500 }
        );
    }
}
