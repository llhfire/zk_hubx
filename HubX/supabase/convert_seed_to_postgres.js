import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.resolve(__dirname, '../apps/api/migrations/0005_seed_from_mysql.sql');
const outputFile = path.resolve(__dirname, 'seed_from_mysql.sql');

if (!fs.existsSync(inputFile)) {
  console.error(`未找到输入文件: ${inputFile}`);
  process.exit(1);
}

console.log(`正在读取并转换 SQLite 种子为 PostgreSQL / Supabase 格式...`);
const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n');

const convertedLines = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('--')) {
    convertedLines.push(line);
    continue;
  }

  // 匹配形如: INSERT OR IGNORE INTO table_name (cols) VALUES (...);
  if (trimmed.startsWith('INSERT OR IGNORE INTO ')) {
    const withoutIgnore = line.replace('INSERT OR IGNORE INTO ', 'INSERT INTO ');
    // 移除末尾分号后追加 ON CONFLICT (id) DO NOTHING;
    const cleanLine = withoutIgnore.endsWith(';') ? withoutIgnore.slice(0, -1) : withoutIgnore;
    convertedLines.push(`${cleanLine} ON CONFLICT (id) DO NOTHING;`);
  } else {
    convertedLines.push(line);
  }
}

fs.writeFileSync(outputFile, convertedLines.join('\n'), 'utf-8');
console.log(`转换完成！已输出至: ${outputFile} (共 ${convertedLines.length} 行)`);
