import type { LanguageConfig, SupportedLanguage } from './types';

export const DEFAULT_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  javascript: {
    id: 'javascript',
    name: 'JavaScript (Node / Web)',
    icon: '⚡',
    extension: 'js',
    executionType: 'browser-js',
    description: 'Chạy trực tiếp trong trình duyệt qua Isolated JS Runtime',
    defaultCode: `// Viết hàm tính tổng hai số và in ra kết quả
function sum(a, b) {
  return a + b;
}

console.log("🚀 Running JavaScript in Browser Sandbox...");
console.log("Result of sum(10, 25):", sum(10, 25));

// Ví dụ mảng & object
const items = [1, 2, 3, 4, 5];
const doubled = items.map(n => n * 2);
console.log("Doubled items:", doubled);
`,
  },
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    icon: '📘',
    extension: 'ts',
    executionType: 'browser-js',
    description: 'Biên dịch & Chạy TypeScript trực tiếp',
    defaultCode: `interface User {
  id: number;
  name: string;
  role: 'admin' | 'user';
}

function greetUser(user: User): string {
  return \`Hello \${user.name} (\${user.role.toUpperCase()})!\`;
}

const admin: User = { id: 1, name: "HiMo Admin", role: "admin" };
console.log("⚡ TypeScript output:");
console.log(greetUser(admin));
`,
  },
  python: {
    id: 'python',
    name: 'Python (Pyodide Wasm)',
    icon: '🐍',
    extension: 'py',
    executionType: 'browser-pyodide',
    description: 'Chạy Python 3.11 trực tiếp bằng WebAssembly (Pyodide)',
    defaultCode: `# Python 3.11 in Pyodide WebAssembly
import math
import sys

def calculate_fibonacci(n: int) -> list[int]:
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[-1] + fib[-2])
    return fib[:n]

print("🐍 Python 3.11 Execution Engine")
print(f"Python Version: {sys.version.split()[0]}")
print("Fibonacci sequence (10 items):", calculate_fibonacci(10))

# Math operations
print("Square root of 144 is:", math.sqrt(144))
`,
  },
  rust: {
    id: 'rust',
    name: 'Rust (Server / Playground API)',
    icon: '🦀',
    extension: 'rs',
    executionType: 'server-rust',
    description: 'Biên dịch qua Rust Playground Server API / Cargo runner',
    defaultCode: `// Rust Playground Execution
fn main() {
    println!("🦀 Hello from Rust Playground!");
    
    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    
    println!("Vector numbers: {:?}", numbers);
    println!("Sum of numbers = {}", sum);
    
    // Pattern matching
    match sum {
        15 => println!("✨ Perfect sum match!"),
        _ => println!("Other sum value"),
    }
}
`,
  },
  html: {
    id: 'html',
    name: 'HTML / CSS / Live UI',
    icon: '🌐',
    extension: 'html',
    executionType: 'html-preview',
    description: 'Xem trực tiếp UI Render (HTML, CSS & JS)',
    defaultCode: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; }
    .btn { background: #6366f1; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🎉 Live UI Interactive Canvas</h2>
    <p>Chỉnh sửa HTML/CSS ở bên phải để cập nhật kết quả UI tức thì!</p>
    <button class="btn" onclick="alert('Hello from Popup Sider!')">Click Me</button>
  </div>
</body>
</html>
`,
  },
  sql: {
    id: 'sql',
    name: 'SQL (SQLite Web)',
    icon: '🗄️',
    extension: 'sql',
    executionType: 'browser-sql',
    description: 'Truy vấn SQLite trực tiếp trên Web',
    defaultCode: `-- Tạo bảng demo và thêm dữ liệu
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, role TEXT);
INSERT INTO users VALUES (1, 'Alice', 'Admin'), (2, 'Bob', 'Developer');

-- Truy vấn
SELECT * FROM users WHERE role = 'Admin';
`,
  },
};
