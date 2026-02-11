export async function readStdin() {
  // If nothing is piped in, return empty string
  if (process.stdin.isTTY) {
    return "";
  }

  return await new Promise((resolve, reject) => {
    let data = "";

    process.stdin.setEncoding("utf8");

    process.stdin.on("data", chunk => {
      data += chunk;
    });

    process.stdin.on("end", () => {
      resolve(data.trim());
    });

    process.stdin.on("error", err => {
      reject(err);
    });
  });
}
