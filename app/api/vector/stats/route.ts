import { NextRequest, NextResponse } from 'next/server';
import { getVectorStats } from '@/lib/vectorstore';

export async function GET(request: NextRequest) {
    try {
        const stats = await getVectorStats();

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(
            {
                error: error.message || 'Failed to fetch stats',
            },
            { status: 500 }
        );
    }
}
