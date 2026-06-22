# logger.py

import json


def print_discovery_state(
    discovery_areas,
    missing_fields=None,
    complete=False,
    next_response=""
):
    print("\n" + "-" * 60)
    print("DISCOVERY STATE")
    print("-" * 60)

    print("\nDiscovery Areas:")
    print(json.dumps(discovery_areas, indent=2))

    if missing_fields is not None:
        print("\nMissing Required Fields:")
        print(json.dumps(missing_fields, indent=2))

    print("\nComplete:")
    print(complete)

    if next_response:
        print("\nNext Response:")
        print(next_response)

    print("\n" + "-" * 60)