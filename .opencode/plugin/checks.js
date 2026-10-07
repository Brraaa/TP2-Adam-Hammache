// Checks post-ecriture : des qu'un agent ecrit un fichier .ts, on relance
// typecheck + lint + tests et on colle la sortie dans le resultat de l'outil,
// pour que l'agent voie le rouge sans qu'on ait a le lui demander.
//
// (INFRA-231 : un check rouge ne doit pas interrompre l'agent, il l'avertit, c'est a
// lui de corriger. D'ou le nothrow : scripts/checks.sh sort en erreur quand c'est
// rouge, et on transmet ce verdict a l'agent au lieu de faire echouer l'outil.)
export const ChecksPlugin = async ({ $, directory }) => {
  return {
    "tool.execute.after": async (input, output) => {
      if (input.tool !== "edit" && input.tool !== "write") return
      const file = input.args?.filePath ?? input.args?.path ?? ""
      if (!file.endsWith(".ts")) return

      const res = await $`bash scripts/checks.sh`.cwd(directory).quiet().nothrow()
      const verdict = res.exitCode === 0 ? "VERTS" : "ROUGES — a corriger avant de rendre la main"
      output.output +=
        `\n\n--- checks post-ecriture : ${verdict} ---\n` + res.stdout.toString() + res.stderr.toString()
    },
  }
}
