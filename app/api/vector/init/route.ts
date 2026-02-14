import { NextRequest, NextResponse } from 'next/server';
import { getConversationIndex, getBookIndex } from '@/lib/vectorstore';

export async function POST(request: NextRequest) {
    try {
        // Initialize both indexes
        await getConversationIndex();
        await getBookIndex();

        return NextResponse.json({
            success: true,
            message: 'Vector indexes initialized successfully',
            indexes: ['conversations', 'books'],
        });
    } catch (error: any) {
        console.error('Error initializing indexes:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to initialize indexes',
            },
            { status: 500 }
        );
    }
}
