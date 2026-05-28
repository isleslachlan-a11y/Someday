/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Simple shared secret to prevent abuse
    const authHeader = request.headers.get("X-Auth-Token");
    if (authHeader !== env.AUTH_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { content, fileName, creator, date } = await request.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `You are summarising a work session update for a two-person startup called Someday — a social travel bucket list app.

The update was written by ${creator} on ${date}.
File: ${fileName}

Raw notes:
---
${content}
---

Write a structured summary with these sections:
**✅ Completed** — what was finished this session
**🔄 In Progress** — what's actively being worked on
**🚧 Blockers / Notes** — anything the other founder needs to know
**➡️ Next Steps** — what's coming next

Be concise. Use bullet points. Keep the tone direct and startup-practical.`
        }]
      })
    });

    const data = await response.json();
    const summary = data.content?.[0]?.text || "Could not generate summary.";

    return new Response(JSON.stringify({ summary }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
