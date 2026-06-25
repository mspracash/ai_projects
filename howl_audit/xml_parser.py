# xml_parser.py

import re
from difflib import get_close_matches

from models import AREA_FIELDS


FIELD_ALIASES = {
    "customer_name": ("customer", "name"),
    "full_name": ("customer", "name"),
    "person_name": ("customer", "name"),

    "customer_role": ("customer", "role"),
    "role": ("customer", "role"),

    "customer_email": ("customer", "email"),
    "email": ("customer", "email"),
    "email_address": ("customer", "email"),

    "customer_phone": ("customer", "phone"),
    "phone": ("customer", "phone"),
    "phone_number": ("customer", "phone"),
    "contact_number": ("customer", "phone"),

    "business_name": ("business", "name"),
    "company_name": ("business", "name"),

    "business_website": ("business", "website"),
    "website": ("business", "website"),
    "website_url": ("business", "website"),
    "url": ("business", "website"),
    "domain": ("business", "website"),

    "business_address": ("business", "address"),
    "company_address": ("business", "address"),
    "address": ("business", "address"),

    "marketing_goal": ("business", "marketing_goals"),
    "marketing_goals": ("business", "marketing_goals"),
    "goal": ("business", "marketing_goals"),
    "goals": ("business", "marketing_goals"),

    "product": ("business", "products"),
    "products": ("business", "products"),

    "service": ("business", "services"),
    "services": ("business", "services"),

    "customer_type": ("business", "customers"),
    "target_customer": ("business", "customers"),
    "target_audience": ("business", "customers"),
    "customers": ("business", "customers"),

    "challenge": ("business", "challenges"),
    "challenges": ("business", "challenges"),
    "pain_point": ("business", "challenges"),
    "pain_points": ("business", "challenges"),
}


def normalize_tag(tag):
    return tag.strip().lower().replace("-", "_")


def strip_code_fence(text):
    text = text.strip()

    text = re.sub(r"^```xml\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    return text.strip()


def extract_updates_body(xml_text):
    xml_text = strip_code_fence(xml_text)

    match = re.search(
        r"<updates>\s*(.*?)\s*</updates>",
        xml_text,
        re.DOTALL | re.IGNORECASE,
    )

    return match.group(1).strip() if match else xml_text.strip()


def extract_response(text):
    text = strip_code_fence(text)

    match = re.search(
        r"<([a-zA-Z_][a-zA-Z0-9_]*)>\s*(.*?)\s*</\1>",
        text,
        re.DOTALL,
    )

    if match:
        return match.group(2).strip()

    return text.strip()


def extract_simple_tag(text, tag):
    text = strip_code_fence(text)

    match = re.search(
        rf"<{tag}>\s*(.*?)\s*</{tag}>",
        text,
        re.DOTALL | re.IGNORECASE,
    )

    return match.group(1).strip() if match else ""


def extract_question(text):
    return extract_simple_tag(text, "question") or text.strip()


def extract_field(xml_text, field_name):
    return extract_simple_tag(xml_text, field_name)


def field_is_declined(value):
    return bool(value) and value.strip().upper() == "DECLINED"


def field_has_value(value):
    return bool(value and value.strip()) and not field_is_declined(value)


def best_match_field(tag, area_hint=None):
    tag = normalize_tag(tag)
    area_hint = normalize_tag(area_hint) if area_hint else None

    if tag in FIELD_ALIASES:
        return FIELD_ALIASES[tag]

    search_areas = (
        [area_hint]
        if area_hint in AREA_FIELDS
        else list(AREA_FIELDS.keys())
    )

    candidates = {}

    for area in search_areas:
        for field in AREA_FIELDS[area]:
            candidates[field] = (area, field)
            candidates[f"{area}_{field}"] = (area, field)
            candidates[f"{field}_{area}"] = (area, field)

    matches = get_close_matches(tag, candidates.keys(), n=1, cutoff=0.72)

    if matches:
        return candidates[matches[0]]

    if area_hint in AREA_FIELDS:
        return area_hint, tag

    return None, tag


def extract_child_fields(xml_text):
    pattern = re.compile(
        r"<([a-zA-Z_][a-zA-Z0-9_]*)>\s*(.*?)\s*</\1>",
        re.DOTALL,
    )

    fields = {}

    for tag, value in pattern.findall(xml_text):
        tag = normalize_tag(tag)
        value = value.strip()

        if not value:
            continue

        _, field_name = best_match_field(tag)
        fields[field_name] = value

    return fields


def extract_area_updates(xml_text):
    pattern = re.compile(
        r"<([a-zA-Z_][a-zA-Z0-9_]*)>\s*(.*?)\s*</\1>",
        re.DOTALL,
    )

    updates = {}
    xml_text = extract_updates_body(xml_text)

    for tag, value in pattern.findall(xml_text):
        tag = normalize_tag(tag)
        value = value.strip()

        if not value:
            continue

        if tag in AREA_FIELDS:
            area_name = tag
            child_matches = pattern.findall(value)

            for child_tag, child_value in child_matches:
                child_tag = normalize_tag(child_tag)
                child_value = child_value.strip()

                if not child_value:
                    continue

                _, field_name = best_match_field(
                    child_tag,
                    area_hint=area_name,
                )

                updates.setdefault(area_name, {})[field_name] = child_value

            continue

        area_name, field_name = best_match_field(tag)

        if area_name:
            updates.setdefault(area_name, {})[field_name] = value

    return updates


def set_field(area_xml, field_name, value):
    value = value.strip()

    pattern = rf"<{field_name}>\s*.*?\s*</{field_name}>"
    replacement = f"<{field_name}>{value}</{field_name}>"

    if re.search(pattern, area_xml, re.DOTALL | re.IGNORECASE):
        return re.sub(
            pattern,
            replacement,
            area_xml,
            flags=re.DOTALL | re.IGNORECASE,
        )

    closing_match = re.search(
        r"</([a-zA-Z_][a-zA-Z0-9_]*)>\s*$",
        area_xml,
    )

    if not closing_match:
        return area_xml

    closing_tag = closing_match.group(0)
    new_field = f"  <{field_name}>{value}</{field_name}>\n"

    return area_xml.replace(
        closing_tag,
        new_field + closing_tag,
    )