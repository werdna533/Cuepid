import { NextRequest, NextResponse } from 'next/server';
import { searchConversations, searchBookContent } from '@/lib/vectorstore';

export async function POST(request: NextRequest) {
    try {
        const { query, type = 'conversation', limit = 5, userId } = await request.json();

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: 'Query is required and must be a string' },
                { status: 400 }
            );
        }

        let results;
        if (type === 'book') {
            results = await searchBookContent(query, limit);
        } else {
            results = await searchConversations(query, limit, userId);
        }

        return NextResponse.json({
            query,
            type,
            results,
            count: results.length,
        });
    } catch (error: any) {
        console.error('Error searching vectors:', error);
        return NextResponse.json(
            {
                error: error.message || 'Failed to search vectors',
            },
            { status: 500 }
        );
    }
}
