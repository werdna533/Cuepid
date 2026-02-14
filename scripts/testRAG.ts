import { searchBookContent } from '../lib/vectorstore';

async function testRAG() {
    const testQueries = [
        'investment model commitment satisfaction alternatives',
        'attachment styles secure anxious avoidant fearful',
        'equity theory fairness relationships',
        'self-disclosure intimacy reciprocity',
        'passionate love companionate love',
    ];

    console.log('🧪 Testing RAG Retrieval System\n');
    console.log('='.repeat(60));

    for (const query of testQueries) {
        console.log(`\n📝 Query: "${query}"`);
        console.log('-'.repeat(60));

        try {
            const results = await searchBookContent(query, 2);

            if (results.length > 0) {
                console.log(`✅ Found ${results.length} relevant chunks\n`);

                results.forEach((result, index) => {
                    console.log(`📖 Result ${index + 1}:`);
                    console.log(`   Similarity: ${(result.score * 100).toFixed(1)}%`);
                    console.log(`   Preview: ${result.item.content.substring(0, 200).replace(/\n/g, ' ')}...`);
                    console.log();
                });
            } else {
                console.log('❌ No results found\n');
            }
        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    console.log('='.repeat(60));
    console.log('\n✨ Test completed!\n');
}

testRAG().catch(console.error);
