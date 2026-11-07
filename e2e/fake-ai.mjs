/* global console */
// A stand-in for an OpenAI-style chat service, for browser tests only. It answers a few kinds of
// question the same way every time: balances (through the get_balances tool), a task (propose_task),
// and anything else with a short help line. Start it with `node e2e/fake-ai.mjs`; it needs no key.
import http from "node:http";

const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
let calls = 0;

const reply = (message) => ({ model: "fake-e2e", choices: [{ message }], usage: { prompt_tokens: 50, completion_tokens: 20 } });

const answer = (messages) => {
  const last = messages.at(-1);
  if (last.role === "tool") {
    const data = JSON.parse(last.content);
    if (data.totalByCurrency) return reply({ content: `Across your accounts you have ${data.totalByCurrency.join(" and ")} right now.` });
    if (data.proposalId) return reply({ content: "I've drafted that task for you. Check the card and confirm it to add it." });
    return reply({ content: "I couldn't find that." });
  }
  const text = String(last.content).toLowerCase();
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  calls += 1;
  if (/balance|ব্যালেন্স|how much money/.test(text))
    return reply({ content: null, tool_calls: [{ id: `call_${calls}`, type: "function", function: { name: "get_balances", arguments: "{}" } }] });
  if (/task|remind me/.test(text)) {
    const businessId = (system.match(uuid) ?? [""])[0];
    const args = { businessId, title: "Call the landlord about the lease", priority: "HIGH" };
    return reply({ content: null, tool_calls: [{ id: `call_${calls}`, type: "function", function: { name: "propose_task", arguments: JSON.stringify(args) } }] });
  }
  return reply({ content: "I can tell you about balances, profit, budgets and tasks, or draft a task for you." });
};

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (req.method !== "POST" || !req.url.endsWith("/chat/completions")) return res.writeHead(404).end();
      const result = answer(JSON.parse(body).messages);
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(result));
    });
  })
  .listen(5099, () => console.log("fake AI on 5099"));
