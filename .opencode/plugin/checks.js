// Checks post-ecriture : des qu'un agent ecrit un fichier .ts, on relance
// typecheck + lint + tests et on colle la sortie dans le resultat de l'outil,
// pour que l'agent voie le rouge sans qu'on ait a le lui demander.
//
// (INFRA-231 : le script scripts/checks.sh ne doit pas interrompre l'agent,
// il l'avertit, c'est a lui de corriger.)
export const ChecksPlugin = async ({ $, directory }) => {
  return {
    "tool.execute.after": async (input, output) => {
      if (input.tool !== "edit" && input.tool !== "write") return
      const file = input.args?.filePath ?? input.args?.path ?? ""
      if (!file.endsWith(".ts")) return

      const res = await $`bash scripts/checks.sh`.cwd(directory).quiet()
      output.output += "\n\n--- checks post-ecriture ---\n" + res.stdout.toString()
    },
  }
}
