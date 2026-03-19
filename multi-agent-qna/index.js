import "dotenv/config";
import readline from "readline";
import chalk from "chalk";
import ora from "ora";

import { streamText } from "./utils/streamText.js";
import { createRuntime } from "./app/createRuntime.js";
import { handleTurn } from "./app/handleTurn.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  const runtime = createRuntime();

  console.log(
    chalk.magenta.bold(
      "Welcome! How can I help with your SEO or digital marketing questions today?"
    )
  );
  console.log(chalk.gray("Type 'exit' or 'quit' to end the conversation.\n"));

  while (true) {
    const input = await ask(chalk.cyan("> "));
    const trimmed = input.trim();

    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();

    if (lower === "exit" || lower === "quit") {
      console.log(chalk.magenta("\nGoodbye!"));
      break;
    }

    console.log(chalk.cyan.bold("\nYou:"));
    console.log(chalk.white(`> ${trimmed}`));

    const spinner = ora({
      text: chalk.gray("Processing your request..."),
      spinner: "dots"
    }).start();

    try {
      const response = await handleTurn(runtime, trimmed, {
        onPhase: (phase) => {
          spinner.text = chalk.gray(phase);
        }
      });

      spinner.stop();

      console.log(chalk.green.bold("\nFinal Answer:"));
      await streamText(String(response || "I’m here to help with SEO and digital marketing questions."), 5);
    } catch (err) {
      spinner.fail(chalk.red("Error"));
      console.error(err.message);
    }

    console.log(chalk.gray("\n----------------------------------------\n"));
  }

  rl.close();
}

main().catch((err) => {
  console.error(chalk.red(`Fatal error: ${err.message}`));
  rl.close();
});