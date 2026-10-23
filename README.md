# Digital Shadow — setup guide

This is a React single-page app. It runs directly in the Claude preview with no
setup, but if you want to run it locally (e.g. to embed it in your final
submission, deploy it, or keep developing it), here is everything you need.

## Tools to install first

| Tool | Version | Why |
|---|---|---|
| Node.js | 18 LTS or newer | Runs the build tooling |
| npm (comes with Node) | 9+ | Installs packages |
| A code editor | Any (VS Code recommended) | Editing the app |

Check what you have:
```bash
node -v
npm -v
```

## Libraries used in the app

| Package | Purpose |
|---|---|
| `react`, `react-dom` | Core UI framework |
| `recharts` | Line, radar, and bar charts (drift trend, signal radar, team view) |
| `lucide-react` | Icon set used throughout the UI |
| `tailwindcss`, `postcss`, `autoprefixer` | Styling |
| `vite`, `@vitejs/plugin-react` | Dev server and build tool |

All of these are listed in `package.json` — you don't need to install them one
by one.

## Project setup from scratch

```bash
# 1. Create a new Vite + React project
npm create vite@latest digital-shadow -- --template react
cd digital-shadow

# 2. Install the extra libraries this app needs
npm install recharts lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 3. Replace src/App.jsx with digital-shadow-app.jsx (rename it to App.jsx)
# 4. In tailwind.config.js, set:
#      content: ["./index.html", "./src/**/*.{js,jsx}"]
# 5. In src/index.css, add:
#      @tailwind base;
#      @tailwind components;
#      @tailwind utilities;
# 6. Make sure src/index.css is imported in src/main.jsx

# 7. Run it
npm run dev
```

Then open the local URL it prints (usually `http://localhost:5173`).

## Building for deployment

```bash
npm run build
```

This outputs a static `dist/` folder you can host anywhere (Vercel, Netlify,
GitHub Pages, or your college server) — no backend required, since all data
in this version is simulated in the browser.

## Note on data

This build simulates behavioral data in memory so you can demo it without a
backend. For a real deployment you'd replace `buildHistory()` and the
`historyMap` state with calls to your actual interaction-logging API and
database (matching the Data Storage Module in your report — SQLite,
`interaction_logs.json`, etc.).
