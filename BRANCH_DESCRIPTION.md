# RAG Integration Branch

## Summary
Integrated Retrieval Augmented Generation (RAG) to enhance AI responses with content from "Intimate Relationships" textbook using local vector database.

## Key Features

### Vector Database
- **Technology**: Vectra (local, file-based vector storage)
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Content**: 707 chunks from "Intimate Relationships" book
- **Cost**: ~$0.008 for initial import

### Book Processing
- **Supported Formats**: DOCX, TXT, MD
- **Chunking Strategy**: 500 words per chunk, 50 words overlap
- **Smart Filtering**: Automatically excludes references and index pages
- **Chapter Detection**: Preserves chapter context

### RAG Pipeline
- **Integration Point**: Chat API (`app/api/chat/route.ts`)
- **Retrieval**: Top-K semantic search (configurable, default: 3)
- **Response Headers**: Includes RAG metadata
  - `X-RAG-Used`: Whether RAG was triggered
  - `X-RAG-Source-Count`: Number of retrieved chunks
  - `X-RAG-Book-Title`: Source book title
  - `X-RAG-Top-Score`: Highest relevance score

### API Endpoints
- `POST /api/vector/init` - Initialize vector indices
- `POST /api/vector/search` - Semantic search
- `GET /api/vector/stats` - Database statistics
- `POST /api/vector/embed` - Generate embeddings

## Technical Implementation

### New Files (16)
- `lib/openai.ts` - OpenAI client wrapper
- `lib/vectorstore.ts` - Vectra database operations
- `lib/bookProcessor.ts` - Text extraction and chunking
- `lib/bookRAG.ts` - RAG retrieval pipeline
- `lib/types/vector.ts` - TypeScript type definitions
- `app/api/vector/*` - Vector database API routes
- `scripts/importBook.ts` - Book import utility
- `scripts/testRAG.ts` - RAG testing script
- `README_VECTOR.md` - Complete usage guide
- `RAG_INDICATOR.md` - Frontend integration guide
- `test-rag.md` - Testing instructions

### Modified Files (5)
- `app/api/chat/route.ts` - Integrated RAG into chat flow
- `package.json` - Added dependencies (openai, vectra, mammoth)
- `package-lock.json` - Dependency lock file
- `.gitignore` - Excluded vector data directory
- `lib/gemini.ts` - Minor compatibility updates

### Dependencies Added
```json
{
  "openai": "^4.77.3",
  "vectra": "^0.9.3",
  "mammoth": "^1.8.0"
}
```

## Merged Changes from Main
- Voice API improvements
- UI/UX enhancements (fonts, backgrounds, styling)
- Scenario and tone settings updates
- All conflicts resolved (package-lock.json via npm install)

## Environment Variables Required
```
OPENAI_API_KEY=your_openai_api_key
VECTOR_STORAGE_PATH=./data/vectors
VECTOR_DIMENSION=1536
VECTOR_MODEL=text-embedding-3-small
```

## Testing

### Quick Test
```bash
# Start dev server
npm run dev

# Test vector search
curl -X POST http://localhost:3000/api/vector/search \
  -H "Content-Type: application/json" \
  -d '{"query": "investment model commitment", "type": "book", "limit": 3}'

# Test RAG-enhanced chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is the investment model?"}], "scenarioId": "planning_a_date", "difficulty": "medium"}'
```

### Expected Results
- AI responses include specific theories and concepts from the book
- Response headers show RAG metadata
- High relevance scores (>0.5) for book-specific questions

## Documentation
- **Setup Guide**: `README_VECTOR.md`
- **Frontend Integration**: `RAG_INDICATOR.md`
- **Testing Guide**: `test-rag.md`
- **Verification Report**: Available in artifacts

## Next Steps
1. Test RAG functionality in web interface
2. Adjust prompt style (currently in test mode showing raw book content)
3. Add frontend RAG indicator UI
4. Ensure voice API doesn't use RAG
5. Create Pull Request to merge into main

## Statistics
- **Files Changed**: 21
- **Lines Added**: 2,516+
- **Vector Chunks**: 707
- **Book Word Count**: ~302,000
- **Import Time**: ~2 minutes
- **Import Cost**: $0.008

## Notes
- Vector data is excluded from Git (in `.gitignore`)
- Other developers need to run import script to generate vectors
- OpenAI API key required for RAG functionality
- Current prompt mode shows raw book content for testing
