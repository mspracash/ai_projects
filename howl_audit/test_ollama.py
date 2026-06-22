# ollama_client.py
import json
import re
import requests

class OllamaClient:
    def __init__(self, model="phi4-mini:latest", url="http://localhost:11434/api/generate"):
        self.model = model
        self.url = url

    def generate(self, prompt):
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.4
            }
        }
        response = requests.post(self.url, json=payload, timeout=120)
        response.raise_for_status()
        return response.json()["response"]

    def generate_json(self, prompt):
        raw = self.generate(prompt)
        return self._extract_json(raw)

    def _extract_json(self, text):
        text = text.strip()
        try:
            return json.loads(text)
        except Exception:
            pass

        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise ValueError(f"No JSON found in LLM response:\n{text}")

        return json.loads(match.group(0))