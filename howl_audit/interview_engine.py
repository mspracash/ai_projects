# interview_engine.py

import asyncio
import copy

from logger import print_discovery_state
from models import DISCOVERY_AREAS, FIELD_ORDER, AREA_FIELDS, OPTIONAL_FIELD_ORDER
from ollama_client import OllamaClient
from prompts import (
    closing_prompt,
    field_question_prompt,
    multi_field_update_prompt,
)
from xml_parser import (
    extract_child_fields,
    extract_field,
    extract_response,
    extract_simple_tag,
    field_has_value,
    field_is_declined,
    set_field,
)




class InterviewEngine:
    def __init__(self):
        self.llm = OllamaClient()
        self.discovery_areas = copy.deepcopy(DISCOVERY_AREAS)

    def is_decline_response(self, text):
        value = text.strip().lower()
        return value in {
            "declined",
            "decline",
            "skip",
            "skip it",
            "not now",
            "later",
            "we can discuss later",
            "discuss later",
            "i don't want to provide it",
            "i prefer not to share",
        }

    def say_status(self, text):
        print(f"\nLupa: {text}")


    def choose_next_field(self):
        for area_name, field_name in FIELD_ORDER + OPTIONAL_FIELD_ORDER:
            value = extract_field(self.discovery_areas[area_name], field_name)

            if field_is_declined(value):
                continue

            if not field_has_value(value):
                return area_name, field_name

        return None, None

    def get_missing_required_fields(self):
        missing = {}

        for area_name, field_name in FIELD_ORDER:
            value = extract_field(
                self.discovery_areas[area_name],
                field_name
            )

            if field_is_declined(value):
                continue

            if not field_has_value(value):
                missing.setdefault(area_name, []).append(field_name)

        return missing

    def python_completion_check(self):
        next_area, next_field = self.choose_next_field()
        return next_area is None and next_field is None

    def merge_updates_xml(self, updates_xml):
        for area_name in self.discovery_areas.keys():
            area_updates = extract_simple_tag(
                updates_xml,
                area_name
            )

            if not area_updates:
                continue

            fields = extract_child_fields(area_updates)

            for field_name, value in fields.items():
                value = value.strip()

                if not value:
                    continue

                if field_name in AREA_FIELDS[area_name]:
                    target_field = field_name
                    target_value = value
                else:
                    target_field = "uncategorized"

                    existing = extract_field(
                        self.discovery_areas[area_name],
                        target_field
                    ).strip()

                    new_item = f"{field_name}: {value}"

                    target_value = (
                        f"{existing}; {new_item}"
                        if existing
                        else new_item
                    )

                self.discovery_areas[area_name] = set_field(
                    self.discovery_areas[area_name],
                    target_field,
                    target_value
                )

    def update_from_customer_message(self, customer_message):
        current_area, current_field = self.choose_next_field()

        raw = self.llm.generate(
            multi_field_update_prompt(
                discovery_areas=self.discovery_areas,
                customer_message=customer_message,
            )
        )

        print("\nRAW FIELD UPDATES:")
        print(raw)

        updates_xml = extract_simple_tag(raw, "updates")

        if updates_xml:
            self.merge_updates_xml(updates_xml)

    def build_final_xml(self):
        sections = "\n\n".join(
            self.discovery_areas.values()
        )

        return f"""
            <audit_discovery>
            {sections}
            </audit_discovery>
            """.strip()

    def create_next_response(self, done):
        if done:
            raw = self.llm.generate(
                closing_prompt(
                    self.build_final_xml()
                )
            )

            return extract_response(raw) or (
                "Great, I have enough context to prepare your audit."
            )

        next_area, next_field = self.choose_next_field()

        raw = self.llm.generate(
            field_question_prompt(
                discovery_areas=self.discovery_areas,
                next_area=next_area,
                next_field=next_field,
            )
        )

        print("\nRAW QUESTION:")
        print(raw)


        return extract_response(raw) or (
            f"Could you tell me your {next_field.replace('_', ' ')}?"
            )
    async def run_async(self):
        question = (
            "Great, let's get started. "
            "Tell me a little about you and what you're working on."
        )

        while True:
            print(f"\nLupa: {question}")
            user_input = input("Customer: ").strip()

            if user_input.lower() in {"exit", "quit"}:
                print("\nLupa: No problem. We can stop here.")
                break

            if self.is_decline_response(user_input):
                area, field = self.choose_next_field()
                if area and field:
                    self.discovery_areas[area] = set_field(
                        self.discovery_areas[area],
                        field,
                        "DECLINED"
                    )
            else:
                self.say_status("Let me organize what I heard.")
                self.update_from_customer_message(user_input)

            missing_fields = self.get_missing_required_fields()
            done = self.python_completion_check()

            if done:
                self.say_status(
                    "I have enough information. Let me wrap things up."
                )

            say = self.create_next_response(done)

            print_discovery_state(
                discovery_areas=self.discovery_areas,
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