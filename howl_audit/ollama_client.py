import json
import requests
from pydantic import BaseModel


class OllamaClient:
    def __init__(
        self,
        model="phi4-mini:latest",
        url="http://localhost:11434/api/generate",
    ):
        self.model = model
        self.url = url

    def _payload(
        self,
        prompt,
        stream=False,
        response_model: type[BaseModel] | None = None,
    ):
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "temperature": 0,
            },
        }

        if response_model:
            payload["format"] = response_model.model_json_schema()

        return payload

    def generate(self, prompt: str, response_model=None):
        response = requests.post(
            self.url,
            json=self._payload(
                prompt,
                response_model=response_model,
            ),
            timeout=120,
        )
        response.raise_for_status()

        raw = response.json()["response"]

        if response_model:
            return response_model.model_validate_json(raw)

        return raw

    def generate_structured(
        self,
        prompt: str,
        response_model: type[BaseModel],
    ):
        response = requests.post(
            self.url,
            json=self._payload(
                prompt,
                response_model=response_model,
            ),
            timeout=120,
        )
        response.raise_for_status()

        return response_model.model_validate_json(
            response.json()["response"]
        )

    def generate_stream(self, prompt: str):
        response = requests.post(
            self.url,
            json=self._payload(prompt, stream=True),
            stream=True,
            timeout=120,
        )
        response.raise_for_status()

        for line in response.iter_lines():
            if not line:
                continue

            chunk = json.loads(line)
            yield chunk.get("response", ""), chunk.get("done", False)