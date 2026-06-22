# extractor.py

from models import FINAL_SCHEMA
from prompts import final_extraction_prompt


def extract_final_json(
    llm,
    discovery_areas
):
    """
    Convert discovery areas into the final
    structured JSON output.
    """

    prompt = final_extraction_prompt(
        discovery_areas=discovery_areas,
        schema=FINAL_SCHEMA
    )

    return llm.generate_json(prompt)