# xml_parser.py

import re

def extract_response(text):
    match = re.search(
        r"<([a-zA-Z_][a-zA-Z0-9_]*)>\s*(.*?)\s*</\1>",
        text,
        re.DOTALL,
    )

    if match:
        return match.group(2).strip()

    return text.strip()

def extract_simple_tag(text, tag):
    match = re.search(
        rf"<{tag}>\s*(.*?)\s*</{tag}>",
        text,
        re.DOTALL | re.IGNORECASE
    )

    return match.group(1).strip() if match else ""


def extract_question(text):
    return (
        extract_simple_tag(text, "question")
        or text.strip()
    )


def extract_field(xml_text, field_name):
    return extract_simple_tag(xml_text, field_name)


def field_is_declined(value):
    return bool(value) and value.strip().upper() == "DECLINED"


def field_has_value(value):
    return bool(value and value.strip()) and not field_is_declined(value)


def extract_child_fields(xml_text):
    pattern = re.compile(
        r"<([a-zA-Z_][a-zA-Z0-9_]*)>\s*(.*?)\s*</\1>",
        re.DOTALL
    )

    return {
        tag: value.strip()
        for tag, value in pattern.findall(xml_text)
        if value.strip()
    }


def set_field(area_xml, field_name, value):
    value = value.strip()

    pattern = rf"<{field_name}>\s*.*?\s*</{field_name}>"
    replacement = f"<{field_name}>{value}</{field_name}>"

    if re.search(pattern, area_xml, re.DOTALL | re.IGNORECASE):
        return re.sub(
            pattern,
            replacement,
            area_xml,
            flags=re.DOTALL | re.IGNORECASE
        )

    closing_match = re.search(
        r"</([a-zA-Z_][a-zA-Z0-9_]*)>\s*$",
        area_xml
    )

    if not closing_match:
        return area_xml

    closing_tag = closing_match.group(0)
    new_field = f"  <{field_name}>{value}</{field_name}>\n"

    return area_xml.replace(
        closing_tag,
        new_field + closing_tag
    )