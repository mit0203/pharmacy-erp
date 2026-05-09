const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'pages');

const colorMap = {
  // Whites to dark variables
  "'#ffffff'": "'var(--bg-card, #ffffff)'",
  "'#fff'": "'var(--bg-card, #ffffff)'",
  "'#f8fafc'": "'var(--bg-card-soft, #f8fafc)'",
  "'#f9fafb'": "'var(--bg-card-soft, #f9fafb)'",
  "'#f1f5f9'": "'var(--bg-card-soft, #f1f5f9)'",
  "'#fbfdff'": "'var(--bg-table-row, #fbfdff)'",

  // Darks to light text
  "'#111827'": "'var(--text-main, #111827)'",
  "'#1f2937'": "'var(--text-main, #1f2937)'",
  "'#0f172a'": "'var(--text-main, #0f172a)'",
  "'#334155'": "'var(--text-muted, #334155)'",
  "'#4b5563'": "'var(--text-muted, #4b5563)'",
  "'#64748b'": "'var(--text-muted, #64748b)'",
  "'#475569'": "'var(--text-muted, #475569)'",
  "'#94a3b8'": "'var(--text-soft, #94a3b8)'",
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  Object.entries(colorMap).forEach(([oldColor, newColor]) => {
    // Regex to match exact strings like '#ffffff'
    const regex = new RegExp(oldColor.replace(/['"]+/g, ''), 'gi');
    content = content.replace(regex, (match) => {
      // Find the mapped replacement (ignoring case)
      const mapped = Object.entries(colorMap).find(([key]) => key.toLowerCase() === "'" + match.toLowerCase() + "'");
      return mapped ? mapped[1].replace(/['"]+/g, '') : match;
    });
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated: ${filePath}`);
  }
}

function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

traverseDirectory(directoryPath);
console.log('Done mapping inline colors.');
