# 📚 将书籍文件放在这里

支持的格式：
- DOCX（推荐）
- TXT
- MD（Markdown）

## 使用方法

1. 将书籍文件复制到此目录
2. 运行导入命令：
   ```bash
   npx tsx scripts/importBook.ts ./data/books/your-book.docx "书籍标题"
   ```

## 示例

```bash
# 导入 Intimate Relationships 书籍
npx tsx scripts/importBook.ts ./data/books/intimate_relationships.docx "Intimate Relationships"
```

查看完整使用指南：../README_VECTOR.md
