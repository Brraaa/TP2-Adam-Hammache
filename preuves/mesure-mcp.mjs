// Lance chaque serveur MCP local declare dans opencode.json, demande tools/list,
// et mesure ce que ses definitions d'outils coutent en contexte (octets, ~tokens = octets/4).
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import dns from "node:dns/promises";

const cfg = JSON.parse(readFileSync(process.argv[2], "utf8")).mcp ?? {};
const timeoutMs = 90000;

function probeLocal(cmd) {
  return new Promise((resolve) => {
    const p = spawn(cmd.join(" "), { shell: true, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "", done = false;
    const finish = (r) => { if (done) return; done = true; try { p.kill(); } catch {} resolve(r); };
    const t = setTimeout(() => finish({ etat: "pas de reponse (timeout)", stderr: err.trim().split("\n").slice(-2).join(" | ") }), timeoutMs);
    p.stderr.on("data", (d) => (err += d));
    p.on("exit", (code) => { clearTimeout(t); finish({ etat: `processus termine (code ${code}) avant de repondre`, stderr: err.trim().split("\n").slice(-2).join(" | ") }); });
    p.stdout.on("data", (d) => {
      out += d;
      for (const line of out.split("\n")) {
        let m; try { m = JSON.parse(line); } catch { continue; }
        if (m.id === 1) p.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n" + JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) + "\n");
        if (m.id === 2) { clearTimeout(t); const tools = m.result?.tools ?? []; const bytes = Buffer.byteLength(JSON.stringify(tools)); finish({ etat: "repond", outils: tools.length, octets: bytes, tokens_approx: Math.round(bytes / 4) }); }
      }
    });
    p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "mesure", version: "1" } } }) + "\n");
  });
}

async function probeRemote(url) {
  const host = new URL(url).hostname;
  try { await dns.lookup(host); } catch (e) { return { etat: `injoignable : ${e.code} ${host}` }; }
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "mesure", version: "1" } } }) });
    return { etat: `HTTP ${r.status}${r.status === 401 ? " (authentification requise, aucune configuree)" : ""}` };
  } catch (e) { return { etat: "erreur reseau : " + e.message }; }
}

let total = 0;
for (const [name, c] of Object.entries(cfg)) {
  const r = c.type === "local" ? await probeLocal(c.command) : await probeRemote(c.url);
  if (r.tokens_approx) total += r.tokens_approx;
  console.log(name.padEnd(11), JSON.stringify(r));
}
console.log(`TOTAL definitions d'outils chargees a chaque session : ~${total} tokens`);
