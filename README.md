🤖 AI Spend Audit
I built this tool to solve a specific headache: AI bill shock. As more teams integrate LLMs, tracking costs across OpenAI, Anthropic, and Gemini becomes a manual mess. This dashboard automates that audit.

Live Link: View the Project : https://vercel.com/riyu-hubs-projects/ai-spend-audit/66VbbPxER1fQFgUYVF5ftuT92V9h

🛠 What it actually does
Centralized Audit: No more jumping between three different billing dashboards.

Leak Detection: I built logic to identify where tokens are being wasted (like excessive system prompts).

Passing the Bar: The core audit engine is backed by 7 passing tests to ensure the math is 100% accurate.

🧠 My Process
This wasn't just about the code. I spent this week focusing on:

User Needs: I talked to 3 potential users to see what they actually care about (check USER_INTERVIEWS.md).

Architecture: I opted for a local-first approach using Next.js to keep data privacy high while keeping the UI snappy.

The Build: You can see my daily progress and the "why" behind my technical choices in DEVLOG.md.

⚙️ Tech Stack
Core: Next.js (App Router) & TypeScript.

UI: Tailwind CSS for speed, Lucide for the visuals.

Reliability: Vitest for the engine testing.

🚀 Getting Started
If you're running this locally:

npm install

npm run dev

Hit localhost:3000 and start auditing.
