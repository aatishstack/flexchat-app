const fs = require('fs');
const path = require('path');

// Jo folders aur files ignore karni hain (Heavy aur Sensitive data)
const IGNORE_DIRS = new Set(['node_modules', '.git', 'build', 'dist', '.next', '.vercel']);
const IGNORE_FILES = new Set(['bundle.js', 'package-lock.json', 'yarn.lock', '.env', '.env.local', '.gitignore']);
const ALLOWED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.html']);

const outputFile = path.join(__dirname, 'flexchat_code.txt');

// Purani file agar pehle se hai toh delete kar do
if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

function bundleProject(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(__dirname, fullPath);

        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.has(file)) {
                bundleProject(fullPath);
            }
        } else {
            const ext = path.extname(file);
            if (!IGNORE_FILES.has(file) && ALLOWED_EXTENSIONS.has(ext)) {
                const header = \n\n--- FILENAME: ${relativePath} ---\n;
                const content = fs.readFileSync(fullPath, 'utf8');
                
                fs.appendFileSync(outputFile, header + content);
            }
        }
    }
}

console.log('🔄 FlexChat project ko bundle kiya ja raha hai...');
bundleProject(__dirname);
console.log('✅ Done! Saara code "flexchat_code.txt" file mein save ho gaya hai.');