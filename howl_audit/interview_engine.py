# interview_engine.py

import asyncio
import json

from logger import print_discovery_state
from ollama_client import OllamaClient
from prompts import (
    closing_prompt,
    field_question_prompt,
    multi_field_update_prompt,
)
from models import (
    FIELD_ORDER,
    ExtractResponse,
    QuestionResponse,
    ClosingResponse,
)


class InterviewEngine:
    def __init__(self):
        self.llm = OllamaClient()
        self.discovery_state = {
            "customer": {},
            "business": {},
        }
        self.last_question = ""

    def say_status(self, text):
        print(f"\nLupa: {text}")

    def field_has_value(self, value):
        return value is not None and str(value).strip() != ""

    def field_is_declined(self, value):
        if not value:
            return False

        return str(value).strip().lower() in {
            "declined",
            "not provided",
            "n/a",
            "na",
            "none",
        }

    def get_field(self, area_name, field_name):
        return self.discovery_state.get(area_name, {}).get(field_name)

    def choose_next_field(self):
        for area_name, field_name in FIELD_ORDER:
            value = self.get_field(area_name, field_name)

            if self.field_is_declined(value):
                continue

            if not self.field_has_value(value):
                return area_name, field_name

        return None, None

    def get_missing_required_fields(self):
        missing = {}

        for area_name, field_name in FIELD_ORDER:
            value = self.get_field(area_name, field_name)

            if self.field_is_declined(value):
                continue

            if not self.field_has_value(value):
                missing.setdefault(area_name, []).append(field_name)

        return missing

    def python_completion_check(self):
        next_area, next_field = self.choose_next_field()
        return next_area is None and next_field is None

    def merge_updates(self, extract_result: ExtractResponse):
        updates = extract_result.model_dump(exclude_none=True)

        for area_name in ["customer", "business"]:
            area_updates = updates.get(area_name, {})

            if not area_updates:
                continue

            self.discovery_state.setdefault(area_name, {})

            for field_name, value in area_updates.items():
                if field_name == "uncategorized":
                    if value:
                        existing = self.discovery_state[area_name].get(
                            "uncategorized",
                            [],
                        )

                        if not isinstance(existing, list):
                            existing = [existing]

                        self.discovery_state[area_name]["uncategorized"] = (
                            existing + value
                        )

                    continue

                if not self.field_has_value(value):
                    continue

                self.discovery_state[area_name][field_name] = value

    def update_from_customer_message(self, customer_message):
        result = self.llm.generate(
            multi_field_update_prompt(
                discovery_state=self.discovery_state,
                customer_message=customer_message,
                last_question=self.last_question,
            ),
            response_model=ExtractResponse,
        )

        print("\nSTRUCTURED FIELD UPDATES:")
        print(result.model_dump_json(indent=2))

        self.merge_updates(result)

    def build_final_xml(self):
        customer = self.discovery_state.get("customer", {})
        business = self.discovery_state.get("business", {})

        def tag(name, value):
            if value is None:
                value = ""

            if isinstance(value, list):
                value = "; ".join(str(v) for v in value if v)

            return f"  <{name}>{value}</{name}>"

        customer_xml = "\n".join(
            [
                "<customer>",
                tag("name", customer.get("name")),
                tag("role", customer.get("role")),
                tag("email", customer.get("email")),
                tag("phone", customer.get("phone")),
                tag("responsibilities", customer.get("responsibilities")),
                tag("uncategorized", customer.get("uncategorized", [])),
                "</customer>",
            ]
        )

        business_xml = "\n".join(
            [
                "<business>",
                tag("name", business.get("name")),
                tag("description", business.get("description")),
                tag("website", business.get("website")),
                tag("address", business.get("address")),
                tag("marketing_goals", business.get("marketing_goals")),
                tag("products", business.get("products")),
                tag("services", business.get("services")),
                tag("customers", business.get("customers")),
                tag("challenges", business.get("challenges")),
                tag("uncategorized", business.get("uncategorized", [])),
                "</business>",
            ]
        )

        return f"""
<audit_discovery>
{customer_xml}

{business_xml}
</audit_discovery>
""".strip()

    def create_next_response(self, done):
        if done:
            result = self.llm.generate(closing_prompt(self.build_final_xml()),
            response_model=ClosingResponse,
            )

            print("\nSTRUCTURED CLOSING:")
            print(result.model_dump_json(indent=2))

            return result.say or (
                "Great, I have enough context to prepare your audit."
            )

        next_area, next_field = self.choose_next_field()

        result = self.llm.generate(
            field_question_prompt(
                discovery_state=self.discovery_state,
                next_area=next_area,
                next_field=next_field,
            ),
            response_model=QuestionResponse,
        )

        print("\nSTRUCTURED QUESTION:")
        print(result.model_dump_json(indent=2))

        return result.question or (
            f"Could you tell me your {next_field.replace('_', ' ')}?"
        )

    async def run_async(self):
        question = (
            "Great, let's get started. "
            "Tell me a little about you and what you're working on."
        )

        self.last_question = question

        while True:
            print(f"\nLupa: {question}")
            user_input = input("Customer: ").strip()

            if user_input.lower() in {"exit", "quit"}:
                print("\nLupa: No problem. We can stop here.")
                break

            self.say_status("Let me organize what I heard.")

            self.update_from_customer_message(user_input)

            missing_fields = self.get_missing_required_fields()
            done = self.python_completion_check()

            if done:
                self.say_status(
                    "I have enough information. Let me wrap things up."
                )

            say = self.create_next_response(done)

            self.last_question = say

            print_discovery_state(
                discovery_areas=self.discovery_state,
                missing_fields=missing_fields,
                complete=done,
                next_response=say,
            )

            print(f"\nLupa: {say}")

            if done:
                break

            question = say

        final_xml = self.build_final_xml()

        self.say_status("Here is the final discovery XML.")

        print("\n--- Final XML ---")
        print(final_xml)

    def run(self):
        asyncio.run(self.run_async())