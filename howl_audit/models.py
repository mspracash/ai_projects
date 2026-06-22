# models.py

AREA_FIELDS = {
    "customer": [
        "name",
        "role",
        "email",
        "phone",
        "responsibilities",
        "uncategorized",
    ],
    "business": [
        "name",
        "description",
        "website",
        "address",
        "marketing_goals",
        "products",
        "services",
        "customers",
        "challenges",
        "uncategorized",
    ],
}

DISCOVERY_AREAS = {
    "customer": """
<customer>
  <name></name>
  <role></role>
  <email></email>
  <phone></phone>
  <responsibilities></responsibilities>
  <uncategorized></uncategorized>
</customer>
""".strip(),

    "business": """
<business>
  <name></name>
  <description></description>
  <website></website>
  <address></address>
  <marketing_goals></marketing_goals>
  <products></products>
  <services></services>
  <customers></customers>
  <challenges></challenges>
  <uncategorized></uncategorized>
</business>
""".strip(),
}


REQUIRED_FIELDS = {
    "customer": [
        "name",
        "role",
        "email",
        "phone",
    ],
    "business": [
        "name",
        "description",
        "address",
        "marketing_goals",
    ],
}

FIELD_LABELS = {
    ("customer", "name"): "customer's full name",
    ("customer", "role"): "customer's role or title",
    ("customer", "email"): "customer's email address",
    ("customer", "phone"): "customer's phone number",

    ("business", "name"): "business name",
    ("business", "description"): "what the business does",
    ("business", "marketing_goals"): "marketing goals or desired outcomes",

    ("business", "website"): "business website URL",
    ("business", "address"): "business address",
}

FIELD_ORDER = [
    ("customer", "name"),
    ("customer", "role"),
    ("customer", "email"),
    ("customer", "phone"),
    ("business", "name"),
    ("business", "website"),
    ("business", "address"),
    ("business", "description"),
    ("business", "marketing_goals"),
]

OPTIONAL_FIELD_ORDER = [
    ("business", "services"),
    ("business", "customers"),
    ("business", "challenges"),
    ("business", "products"),
]