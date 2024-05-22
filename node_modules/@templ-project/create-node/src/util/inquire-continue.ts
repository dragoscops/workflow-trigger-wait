export default async function (
  message = "Do you wish to continue?",
): Promise<void> {
  return import("inquirer")
    .then(({ default: inquirer }) =>
      inquirer.prompt([
        {
          type: "confirm",
          name: "continue",
          message,
        },
      ]),
    )
    .then((answers) => {
      if (!answers.continue) {
        process.exit(0);
      }
    });
}
