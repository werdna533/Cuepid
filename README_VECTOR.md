# 使用指南：向量数据库与书籍 RAG 功能

## 快速开始

### 1. 配置 OpenAI API Key

编辑 `.env.local` 文件，添加您的 OpenAI API Key：

```env
OPENAI_API_KEY=sk-your-api-key-here
```

获取 API Key：https://platform.openai.com/api-keys

---

### 2. 放置书籍文件

将您的书籍文件放到 `data/books/` 目录：

```bash
# 支持的格式：DOCX、TXT、MD
cp /path/to/your/book.docx data/books/intimate_relationships.docx
```

---

### 3. 导入书籍到向量数据库

使用导入脚本：

```bash
npx tsx scripts/importBook.ts ./data/books/intimate_relationships.docx "Intimate Relationships"
```

**预计时间**：根据书籍大小，约 2-5 分钟（API 调用速度限制）

**输出示例**：
```
📚 Starting book import...
   File: /path/to/book.docx
   Title: Intimate Relationships

📖 Processing book file...
   ✓ Extracted 156 chunks

🔄 Importing to vector database...
   ✓ Imported 156 chunks

📊 Vector Database Statistics:
   Book chunks: 156
   Total vectors: 156
   Dimension: 1536

✅ Book import completed successfully!
```

---

## API 使用

### 初始化向量索引

首次使用前调用（会自动创建 `data/vectors/` 目录）：

```bash
curl -X POST http://localhost:3000/api/vector/init
```

### 语义搜索书籍内容

```bash
curl -X POST http://localhost:3000/api/vector/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "如何维持长期关系中的激情？",
    "type": "book",
    "limit": 3
  }'
```

**响应示例**：
```json
{
  "query": "如何维持长期关系中的激情？",
  "type": "book",
  "results": [
    {
      "item": {
        "bookTitle": "Intimate Relationships",
        "chapterTitle": "Chapter 8: Maintaining Passion",
        "content": "研究表明，长期关系中激情的维持需要...",
        "timestamp": "2026-02-14T20:00:00.000Z"
      },
      "score": 0.87
    }
  ],
  "count": 3
}
```

### 查看统计信息

```bash
curl http://localhost:3000/api/vector/stats
```

---

## 在聊天中使用 RAG

在您的聊天 API 中集成书籍知识检索：

```typescript
import { queryWithBookKnowledge } from '@/lib/bookRAG';

// 在处理用户消息时
const { enhancedPrompt, sources } = await queryWithBookKnowledge(
  userMessage,
  systemPrompt,
  3 // 检索前3个最相关的段落
);

// 使用 enhancedPrompt 调用 AI
const aiResponse = await getChatModel(enhancedPrompt).generateContent(userMessage);

// sources 包含引用来源，可以展示给用户
```

---

## 文件结构

```
Cuepid/
├── data/
│   ├── books/                  # 书籍源文件
│   │   └── intimate_relationships.docx
│   └── vectors/                # 向量数据库（自动生成）
│       ├── conversations/      # 对话向量索引
│       └── books/              # 书籍向量索引
├── lib/
│   ├── openai.ts              # OpenAI 客户端
│   ├── vectorstore.ts         # 向量存储服务
│   ├── bookProcessor.ts       # 书籍文本提取
│   └── bookRAG.ts             # RAG 检索服务
├── scripts/
│   └── importBook.ts          # 书籍导入脚本
└── app/api/vector/
    ├── init/route.ts          # 初始化索引
    ├── embed/route.ts         # 生成向量
    ├── search/route.ts        # 语义搜索
    └── stats/route.ts         # 统计信息
```

---

## 常见问题

### Q: API 调用失败怎么办？

检查 OpenAI API Key 是否正确配置：
```bash
echo $OPENAI_API_KEY  # 或查看 .env.local
```

### Q: 导入书籍很慢？

这是正常的。OpenAI API 有速率限制，大型书籍可能需要几分钟。可以在脚本中看到实时进度。

### Q: 想导入多本书？

重复执行导入脚本即可：
```bash
npx tsx scripts/importBook.ts ./data/books/book1.docx "Book 1"
npx tsx scripts/importBook.ts ./data/books/book2.docx "Book 2"
```

所有书籍会存储在同一个向量索引中，搜索时自动检索最相关内容。

### Q: 如何删除已导入的书籍？

删除向量数据库目录：
```bash
rm -rf data/vectors/books
```

然后重新初始化并导入。

---

## 成本估算

- **向量生成**：$0.02/百万 tokens
- **示例**：一本 30 万字的书 ≈ 20 万 tokens ≈ **$0.004**（不到一分钱）

---

## 下一步

1. **集成到聊天 API** - 修改 `app/api/chat/route.ts` 使用 `queryWithBookKnowledge`
2. **添加前端展示** - 显示 RAG 引用来源
3. **优化分块策略** - 调整 `bookProcessor.ts` 中的 chunk 大小

祝您使用愉快！📚✨
