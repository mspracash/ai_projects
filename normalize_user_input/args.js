export function parseArgs(argv = process.argv) {
  const args = {
    text: "",
    model: "",
    url: ""
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];

    switch (token) {
      case "--text":
        args.text = argv[i + 1] || "";
        i++;
        break;

      case "--model":
        args.model = argv[i + 1] || "";
        i++;
        break;

      case "--url":
        args.url = argv[i + 1] || "";
        i++;
        break;

      case "-h":
      case "--help":
        printHelp();
        process.exit(0);

      default:
        // ignore unknown flags
        break;
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Digital Marketing Text Normalizer

Usage:
  node index.js --text "your message"
  echo "your message" | node index.js

Options:
  --text    Input text to normalize
  --model   Ollama model override
  --url     Ollama server URL

Examples:
  node index.js --text "We are not getting leads from gmb"
  node index.js --model phi4-mini:latest --text "PPC is not converting"
  echo "Pages aren't indexed in gsc" | node index.js
`);
}
