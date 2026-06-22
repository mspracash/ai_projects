# ollama_client.py

import aiohttp
import json
import requests


class OllamaClient:
    def __init__(
        self,
        model="phi4-mini:latest",
        url="http://localhost:11434/api/generate"
    ):
        self.model = model
        self.url = url

    def _payload(self, prompt, stream=False):
        return {
            "model": self.model,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "temperature": 0.2
            }
        }

    def generate(self, prompt):
        response = requests.post(
            self.url,
            json=self._payload(prompt),
            timeout=120
        )
        response.raise_for_status()
        return response.json()["response"]

    async def generate_async(self, prompt):
        timeout = aiohttp.ClientTimeout(total=120)

        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                self.url,
                json=self._payload(prompt)
            ) as response:
                response.raise_for_status()
                data = await response.json()
                return data["response"]

    def generate_stream(self, prompt):
        response = requests.post(
            self.url,
            json=self._payload(prompt, stream=True),
            stream=True,
            timeout=120
        )
        response.raise_for_status()

        for line in response.iter_lines():
            if not line:
                continue
            chunk = json.loads(line.decode("utf-8"))
            yield chunk.get("response", ""), chunk.get("done", False)