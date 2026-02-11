#!/usr/bin/env node

import readline from "node:readline";
import { normalize } from "./normalize.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

console.log("Digital Marketing Text Normalizer");
console.log("Type your message and press Enter.");
console.log("Type 'exit' to quit.\n");

while (true) {
  const input = await ask("> ");

  if (!input) continue;

  const cmd = input.toLowerCase();

  if (cmd === "exit" || cmd === "quit" || cmd === "q") {
    console.log("Goodbye.");
    break;
  }

  try {
    const output = await normalize(input);
    console.log("\n" + output + "\n");
  } catch (err) {
    console.error("Error:", err.message, "\n");
  }
}

rl.close();
process.exit(0);
