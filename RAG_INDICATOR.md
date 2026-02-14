# RAG 指示器使用说明

## 后端修改

已在聊天 API 响应头中添加 RAG 元数据：

```typescript
headers: {
  "X-RAG-Used": "true",              // 是否使用了 RAG
  "X-RAG-Source-Count": "3",         // 检索到的块数量
  "X-RAG-Book-Title": "Intimate Relationships",  // 书籍标题
  "X-RAG-Top-Score": "0.823",        // 最高相似度分数
}
```

---

## 前端集成示例

### 方法 1：在聊天界面显示徽章

修改前端聊天组件，检测响应头并显示 RAG 指示器：

```typescript
// 在发送消息的地方
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages, scenarioId, difficulty })
});

// 检查 RAG 使用情况
const ragUsed = response.headers.get('X-RAG-Used') === 'true';
const sourceCount = response.headers.get('X-RAG-Source-Count');
const bookTitle = response.headers.get('X-RAG-Book-Title');
const topScore = response.headers.get('X-RAG-Top-Score');

if (ragUsed) {
  // 显示 RAG 指示器
  console.log(`📚 Based on ${bookTitle} (${sourceCount} sources, ${(parseFloat(topScore) * 100).toFixed(1)}% relevance)`);
}
```

### 方法 2：在消息旁显示图标

在 AI 回复旁边添加一个小图标：

```jsx
{ragUsed && (
  <div className="rag-indicator" title={`Based on ${bookTitle}`}>
    📚 <span className="text-xs text-gray-500">
      Knowledge-enhanced
    </span>
  </div>
)}
```

### 方法 3：悬停提示

```jsx
{ragUsed && (
  <div className="tooltip">
    <span className="icon">💡</span>
    <span className="tooltiptext">
      This response is enhanced with insights from 
      "{bookTitle}" ({sourceCount} relevant passages found)
    </span>
  </div>
)}
```

---

## 测试验证

### 使用 curl 测试

```bash
curl -i -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the investment model?"}
    ],
    "scenarioId": "planning_a_date",
    "difficulty": "medium"
  }'
```

**查看响应头**：
```
X-RAG-Used: true
X-RAG-Source-Count: 3
X-RAG-Book-Title: Intimate Relationships
X-RAG-Top-Score: 0.823
```

---

## UI 设计建议

### 简洁版（推荐）
```
AI 回复
📚 Enhanced with book knowledge
```

### 详细版
```
AI 回复
💡 Based on "Intimate Relationships"
   3 relevant passages • 82% relevance
```

### 最小化版
```
AI 回复 📚
```

---

## CSS 样式示例

```css
.rag-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  margin-left: 8px;
}

.rag-indicator:hover {
  opacity: 0.8;
  cursor: help;
}
```

---

## 下一步

1. 在前端聊天组件中读取响应头
2. 根据 `X-RAG-Used` 显示/隐藏指示器
3. 可选：显示相似度分数和来源数量
4. 可选：添加点击查看详情功能

这样用户就能清楚地知道哪些回答是基于书籍知识增强的了！📚✨
