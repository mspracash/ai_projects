export async function ollamaChat({ system, user, model, url, options = {} }) {
  const response = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      stream: false,
      options
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error ${response.status}`);
  }

  return response.json();
}
