"""Resume une execution de l'exercice 1 (fichier *.resume.txt) : outils appeles, checks lances, conclusion."""
import re, sys, collections
sys.stdout.reconfigure(encoding="utf-8")
lines = open(sys.argv[1], encoding="utf-8").read().splitlines()
calls = [l for l in lines if "] APPEL " in l]
kinds = collections.Counter(l.split("] APPEL ")[1].split(" ")[0] for l in calls)
print("Appels d'outils :", ", ".join(f"{k} x{v}" for k, v in kinds.most_common()), "| sous-agents (Task) :", kinds.get("Task", 0) + kinds.get("Agent", 0))
print("Commandes de verification lancees par l'agent :")
for l in calls:
    m = re.search(r'"command": "(.*?)", "description"', l)
    if m and "npm" in m.group(1):
        print("   $", m.group(1)[:130])
final = lines[lines.index("=== RESULTAT FINAL ===") + 1:]
keep = [l for l in final if l.strip() and not l.startswith(("```", "{", "}", '  "', "    {", "  ]"))]
print("\nConclusion de l'agent :")
for l in keep[: int(sys.argv[2]) if len(sys.argv) > 2 else 22]:
    print(l)
