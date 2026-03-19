export async function streamText(text, delay=15){
    if (!text) return;
    for (const char of text){
        process.stdout.write(char);
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
    process.stdout.write("\n");
}