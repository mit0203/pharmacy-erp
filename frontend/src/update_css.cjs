const fs = require('fs');
let css = fs.readFileSync('d:/pharmacy-erp/frontend/src/index.css', 'utf-8');

const themeVars = `  /* Global Theme Variables - Light */
  --bg-main: #f0f2f8;
  --bg-card: #ffffff;
  --bg-sidebar: #ffffff;
  --bg-topbar: #ffffff;
  --bg-elevated: #ffffff;
  --bg-soft: #f8fafc;
  --text-main: #1a202c;
  --text-muted: #718096;
  --text-table: #2d3748;
  --border-color: #e8ecf4;
  --border-light: #f0f2f8;
  --input-bg: #f7f8fc;
  --input-border: #e2e8f0;
  --input-focus: #2d3a8c;
  --shadow-soft: 0 10px 30px rgba(15, 23, 42, 0.06);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(45, 58, 140, 0.3);
  --hover-bg: #f0f4ff;
  --table-head-bg: #f7f8fc;
  --table-row-hover: #f7f9ff;
  --toast-bg: #ffffff;
  --dropdown-bg: #ffffff;
  --btn-primary-bg: linear-gradient(135deg, #2d3a8c 0%, #3d4fcf 100%);
  --btn-primary-text: #ffffff;
  --btn-primary-shadow: rgba(45, 58, 140, 0.3);
  --btn-primary-shadow-hover: rgba(45, 58, 140, 0.4);
  --btn-secondary-bg: #f0f4ff;
  --btn-secondary-border: #c7d2fe;
  --btn-secondary-text: #2d3a8c;
  --btn-secondary-hover-bg: #e0e8ff;
  --login-bg: linear-gradient(135deg, #e8ecf8 0%, #f0f2fb 50%, #e4e9f7 100%);
}

[data-theme='dark'] {
  --brand-dark: #60a5fa;
  --bg-main: #0f172a;
  --bg-card: #1e293b;
  --bg-sidebar: #1e293b;
  --bg-topbar: #1e293b;
  --bg-elevated: #1e293b;
  --bg-soft: #334155;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-table: #e2e8f0;
  --border-color: #334155;
  --border-light: #1e293b;
  --input-bg: #0f172a;
  --input-border: #475569;
  --input-focus: #3b82f6;
  --shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.4);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.5);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.6);
  --hover-bg: #334155;
  --table-head-bg: #0f172a;
  --table-row-hover: #0f172a;
  --toast-bg: #1e293b;
  --dropdown-bg: #1e293b;
  --btn-primary-bg: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  --btn-primary-text: #ffffff;
  --btn-primary-shadow: rgba(0, 0, 0, 0.3);
  --btn-primary-shadow-hover: rgba(0, 0, 0, 0.5);
  --btn-secondary-bg: #334155;
  --btn-secondary-border: #475569;
  --btn-secondary-text: #e2e8f0;
  --btn-secondary-hover-bg: #475569;
  --login-bg: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
}`;

css = css.replace(/\}\s+\*/, themeVars + '\n\n*');

// Basic tags
css = css.replace(/body \{[\s\S]*?\}/, `body {
  font-family: 'Inter', sans-serif;
  background: var(--bg-main);
  color: var(--text-main);
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}`);

css = css.replace(/::-webkit-scrollbar-track \{ background: #f0f2f8; \}/, '::-webkit-scrollbar-track { background: var(--bg-main); }');
css = css.replace(/::-webkit-scrollbar-thumb \{ background: #c1c9e0; border-radius: 3px; \}/, '::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }');
css = css.replace(/::-webkit-scrollbar-thumb:hover \{ background: #a0aec0; \}/, '::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }');

// Specific classes updates:
css = css.replace(/\.sidebar \{[\s\S]*?\}/, `.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  z-index: 50;
  box-shadow: 2px 0 12px var(--shadow-color);
  overflow: hidden;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}`);

css = css.replace(/\.topbar \{[\s\S]*?\}/, `.topbar {
  position: fixed;
  top: 0;
  left: var(--sidebar-width);
  right: 0;
  height: var(--topbar-height);
  background: var(--bg-topbar);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 24px;
  z-index: 40;
  box-shadow: var(--shadow-sm);
  overflow: visible;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}`);

// Search colors in css
css = css.replace(/background: #ffffff;/g, 'background: var(--bg-card);');
css = css.replace(/background: #f0f2f8;/g, 'background: var(--bg-main);');
css = css.replace(/border-right: 1px solid #e8ecf4;/g, 'border-right: 1px solid var(--border-color);');
css = css.replace(/border-bottom: 1px solid #e8ecf4;/g, 'border-bottom: 1px solid var(--border-color);');
css = css.replace(/border-top: 1px solid #e8ecf4;/g, 'border-top: 1px solid var(--border-color);');

css = css.replace(/color: #a0aec0;/g, 'color: var(--text-muted);');
css = css.replace(/color: #718096;/g, 'color: var(--text-muted);');
css = css.replace(/color: #2d3748;/g, 'color: var(--text-table);');
css = css.replace(/color: #1a202c;/g, 'color: var(--text-main);');

css = css.replace(/background: #f0f4ff;/g, 'background: var(--hover-bg);');
css = css.replace(/background: linear-gradient\(135deg, #2d3a8c 0%, #3d4fcf 100%\);/g, 'background: var(--btn-primary-bg);');
css = css.replace(/color: #ffffff;/g, 'color: var(--btn-primary-text);');
css = css.replace(/box-shadow: 0 4px 12px rgba\(45, 58, 140, 0\.3\);/g, 'box-shadow: 0 4px 12px var(--btn-primary-shadow);');
css = css.replace(/box-shadow: 0 6px 18px rgba\(45, 58, 140, 0\.4\);/g, 'box-shadow: 0 6px 18px var(--btn-primary-shadow-hover);');

css = css.replace(/background: #f7f8fc;/g, 'background: var(--input-bg);');
css = css.replace(/border: 1\.5px solid #e8ecf4;/g, 'border: 1.5px solid var(--input-border);');
css = css.replace(/border-color: #2d3a8c;/g, 'border-color: var(--input-focus);');
css = css.replace(/background: #fff;/g, 'background: var(--bg-card);');

css = css.replace(/border: 1px solid #e8ecf4;/g, 'border: 1px solid var(--border-color);');
css = css.replace(/border-bottom: 1px solid #f1f5f9;/g, 'border-bottom: 1px solid var(--border-light);');
css = css.replace(/border-bottom: 1px solid #f8fafc;/g, 'border-bottom: 1px solid var(--border-light);');
css = css.replace(/background: #f8fbff;/g, 'background: var(--hover-row);');
css = css.replace(/background: #eef3ff;/g, 'background: var(--bg-soft);');
css = css.replace(/background: #fafcff;/g, 'background: var(--bg-soft);');
css = css.replace(/color: #64748b;/g, 'color: var(--text-muted);');

css = css.replace(/box-shadow: 0 2px 12px rgba\(0,0,0,0\.05\);/g, 'box-shadow: 0 2px 12px var(--shadow-color);');
css = css.replace(/box-shadow: 0 8px 24px rgba\(45, 58, 140, 0\.12\);/g, 'box-shadow: 0 8px 24px var(--shadow-elevated);');

css = css.replace(/border-bottom: 2px solid #e8ecf4;/g, 'border-bottom: 2px solid var(--border-color);');
css = css.replace(/border-bottom: 1px solid #f0f2f8;/g, 'border-bottom: 1px solid var(--border-light);');
css = css.replace(/background: #f7f9ff;/g, 'background: var(--hover-row);');

css = css.replace(/border: 1\.5px solid #c7d2fe;/g, 'border: 1.5px solid var(--btn-secondary-border);');
css = css.replace(/color: #2d3a8c;/g, 'color: var(--btn-secondary-text);');
css = css.replace(/background: #e0e8ff;/g, 'background: var(--btn-secondary-hover-bg);');

css = css.replace(/background: linear-gradient\(135deg, #e8ecf8 0%, #f0f2fb 50%, #e4e9f7 100%\);/g, 'background: var(--login-bg);');
css = css.replace(/background: white;/g, 'background: var(--bg-card);');
css = css.replace(/box-shadow: 0 20px 60px rgba\(45, 58, 140, 0\.12\);/g, 'box-shadow: 0 20px 60px var(--shadow-elevated);');
css = css.replace(/color: #4a5568;/g, 'color: var(--text-muted);');
css = css.replace(/border: 1\.5px solid #e2e8f0;/g, 'border: 1.5px solid var(--input-border);');

css = css.replace(/border-left: 4px solid #2d3a8c;/g, 'border-left: 4px solid var(--input-focus);');
css = css.replace(/background: rgba\(255,255,255,0\.3\);/g, 'background: var(--border-color);');
css = css.replace(/background: #e8ecf4;/g, 'background: var(--border-color);');

// More adjustments
css = css.replace(/color: white;/g, 'color: var(--btn-primary-text);');
// Remove hardcoded `background: white` that we might have missed
css = css.replace(/background: white;/gi, 'background: var(--bg-card);');

fs.writeFileSync('d:/pharmacy-erp/frontend/src/index.css', css);
