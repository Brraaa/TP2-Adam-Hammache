// Complement de mesure-mcp.mjs, pour les serveurs MCP locaux declares dans opencode.json :
// temps de demarrage, outils qui ecrivent ou agissent a l'exterieur (depot distant, pages Notion, navigateur), et resultat d'un vrai appel en lecture
// sans jeton (aucun bloc "environment" n'en fournit dans la config).
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const cfg = JSON.parse(readFileSync(process.argv[2], "utf8")).mcp ?? {};
const ECRIT = /^(create|update|delete|push|merge|fork|add_|browser_(click|type|navigate|evaluate|run_code|file_upload|fill_form|press_key|drag|select_option))|API-(post-(page|comment)|patch-|update-|delete-|create-|move-)/i;
const APPEL = {
  github: { name: "search_code", arguments: { q: "salles-api" } },
  notion: { name: "API-get-self", arguments: {} },
};

function probe(name, cmd) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn(cmd.join(" "), { shell: true, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", done = false;
    const r = { serveur: name };
    const finish = () => { if (done) return; done = true; try { p.kill(); } catch {} resolve(r); };
    const timer = setTimeout(() => { r.etat = "timeout"; finish(); }, 120000);
    const send = (o) => p.stdin.write(JSON.stringify(o) + "\n");
    p.on("exit", (c) => { clearTimeout(timer); r.etat ??= `sorti (code ${c})`; finish(); });
    p.stdout.on("data", (d) => {
      out += d;
      const lines = out.split("\n"); out = lines.pop();
      for (const line of lines) {
        let m; try { m = JSON.parse(line); } catch { continue; }
        if (m.id === 1) { send({ jsonrpc: "2.0", method: "notifications/initialized" }); send({ jsonrpc: "2.0", id: 2, method: "tools/list" }); }
        if (m.id === 2) {
          const tools = m.result?.tools ?? [];
          r.demarrage_s = ((Date.now() - t0) / 1000).toFixed(1);
          r.outils = tools.length;
          const w = tools.map((t) => t.name).filter((n) => ECRIT.test(n));
          r.outils_qui_ecrivent = w.length;
          r.exemples = w.slice(0, 4).join(", ");
          if (APPEL[name]) send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: APPEL[name] });
          else { r.etat = "repond"; clearTimeout(timer); finish(); }
        }
        if (m.id === 3) {
          const txt = (m.result?.content?.[0]?.text ?? JSON.stringify(m.error ?? m.result)).replace(/\s+/g, " ");
          r.appel = `${APPEL[name].name} -> ${m.result?.isError || m.error || /"status":40[13]|unauthorized/i.test(txt) ? "ERREUR" : "ok"} : ${txt.slice(0, 110)}`;
          r.etat = "repond"; clearTimeout(timer); finish();
        }
      }
    });
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "mesure", version: "1" } } });
  });
}

for (const [name, c] of Object.entries(cfg)) {
  if (c.type !== "local") continue;
  const r = await probe(name, c.command);
  console.log(`${r.serveur.padEnd(10)} ${r.etat} | demarrage ${r.demarrage_s ?? "-"} s | ${r.outils ?? 0} outils dont ${r.outils_qui_ecrivent ?? 0} qui ecrivent ou agissent${r.exemples ? " (" + r.exemples + ", ...)" : ""}`);
  if (r.appel) console.log(`           appel reel sans jeton : ${r.appel}`);
}
