# RAG 功能测试指南

## 如何验证 AI 是否使用了书籍知识

### 方法 1：对比测试（推荐）

#### 步骤 1：临时禁用 RAG

编辑 `app/api/chat/route.ts`，注释掉 RAG 调用：

```typescript
// RAG: Enhance system prompt with book knowledge
const lastMessage = messages[messages.length - 1].content;
/* 临时注释掉
const { enhancedPrompt } = await queryWithBookKnowledge(
  lastMessage,
  systemPrompt,
  3
);
systemPrompt = enhancedPrompt;
*/
```

#### 步骤 2：测试相同问题

**测试问题**（选择书中有具体内容的主题）：
```bash
# 无 RAG 版本
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the investment model of relationships?"}
    ],
    "scenarioId": "planning_a_date",
    "difficulty": "medium"
  }'
```

记录回答 A（无 RAG）

#### 步骤 3：启用 RAG 并重新测试

取消注释，重启服务器，再次测试相同问题，记录回答 B（有 RAG）

#### 步骤 4：对比分析

- **回答 A**：应该是通用的、泛泛的建议
- **回答 B**：应该包含更具体的概念和细节（来自书籍）

---

### 方法 2：使用书中特定概念测试

#### 测试问题清单

这些是《Intimate Relationships》中的特定概念，普通 AI 不太可能详细了解：

1. **Investment Model（投资模型）**
   ```
   问题：What is the investment model in relationships?
   预期：应提到 commitment, satisfaction, alternatives, investments
   ```

2. **Attachment Styles（依恋风格）**
   ```
   问题：Can you explain the four attachment styles?
   预期：应提到 secure, anxious, avoidant, fearful-avoidant
   ```

3. **Equity Theory（公平理论）**
   ```
   问题：How does equity theory apply to relationships?
   预期：应提到 over-benefited, under-benefited, equitable relationships
   ```

4. **Self-Disclosure（自我披露）**
   ```
   问题：What role does self-disclosure play in intimacy?
   预期：应提到 reciprocity, depth, breadth
   ```

---

### 方法 3：添加调试日志

#### 修改 `lib/bookRAG.ts` 添加日志：

```typescript
export async function queryWithBookKnowledge(
    userQuery: string,
    systemPrompt: string,
    topK: number = 3
): Promise<{ enhancedPrompt: string; sources: SearchResult<BookChunkItem>[] }> {
    const bookResults = await retrieveBookKnowledge(userQuery, topK);

    // 添加调试日志
    console.log('🔍 RAG Query:', userQuery);
    console.log('📚 Found chunks:', bookResults.length);
    if (bookResults.length > 0) {
        console.log('📖 Top result preview:', bookResults[0].item.content.substring(0, 200));
        console.log('📊 Similarity score:', bookResults[0].score);
    }

    if (bookResults.length === 0) {
        console.log('⚠️ No relevant book content found, using base prompt only');
        return {
            enhancedPrompt: systemPrompt,
            sources: [],
        };
    }

    const bookContext = formatBookContext(bookResults);
    const enhancedPrompt = `${systemPrompt}\n\n${bookContext}`;

    return {
        enhancedPrompt,
        sources: bookResults,
    };
}
```

#### 查看服务器日志

运行测试后，在终端查看：
```
🔍 RAG Query: What is the investment model?
📚 Found chunks: 3
📖 Top result preview: The investment model proposes that commitment...
📊 Similarity score: 0.82
```

如果看到这些日志，说明 RAG 正在工作！

---

### 方法 4：直接测试向量搜索 API

#### 测试特定概念是否在向量库中

```bash
# 测试 1：Investment Model
curl -X POST http://localhost:3000/api/vector/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "investment model commitment satisfaction alternatives",
    "type": "book",
    "limit": 1
  }' | jq '.results[0].item.content' | head -c 500

# 测试 2：Attachment Styles
curl -X POST http://localhost:3000/api/vector/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "attachment styles secure anxious avoidant",
    "type": "book",
    "limit": 1
  }' | jq '.results[0].item.content' | head -c 500
```

如果返回相关内容，说明向量库有这些知识。

---

### 方法 5：创建测试脚本

创建 `scripts/testRAG.ts`：

```typescript
import { searchBookContent } from '../lib/vectorstore';

async function testRAG() {
  const testQueries = [
    'investment model relationships',
    'attachment styles secure anxious',
    'equity theory fairness',
    'self-disclosure intimacy',
  ];

  console.log('🧪 Testing RAG Retrieval\n');

  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    const results = await searchBookContent(query, 1);
    
    if (results.length > 0) {
      console.log(`✅ Found relevant content (score: ${results[0].score.toFixed(3)})`);
      console.log(`📖 Preview: ${results[0].item.content.substring(0, 150)}...`);
    } else {
      console.log('❌ No results found');
    }
  }
}

testRAG().catch(console.error);
```

运行：
```bash
npx tsx scripts/testRAG.ts
```

---

## 快速验证清单

- [ ] 运行对比测试（有/无 RAG）
- [ ] 测试书中特定概念（如 investment model）
- [ ] 查看服务器日志确认 RAG 调用
- [ ] 直接测试向量搜索 API
- [ ] 检查相似度分数（> 0.5 说明相关性高）

---

## 预期结果

### ✅ RAG 正常工作的标志：

1. **服务器日志**显示"Found chunks: 3"
2. **相似度分数** > 0.3（越高越相关）
3. **AI 回答**包含书中特定术语和概念
4. **回答深度**明显优于无 RAG 版本

### ❌ RAG 未工作的标志：

1. 日志显示"Found chunks: 0"
2. AI 回答过于通用
3. 有/无 RAG 的回答几乎相同

---

## 推荐测试问题

### 高特异性问题（书中有详细内容）：
- "What is the investment model of commitment?"
- "Explain the four attachment styles"
- "How does equity theory work in relationships?"

### 低特异性问题（通用问题）：
- "How to be happy?"
- "What is love?"

高特异性问题应该触发高相似度检索（> 0.5），低特异性问题可能相似度较低。
