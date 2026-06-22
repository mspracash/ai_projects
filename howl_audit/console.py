import sys

from prompt_toolkit import PromptSession
from prompt_toolkit.input.defaults import create_input
from prompt_toolkit.output.defaults import create_output


_session = None


def get_customer_input(message: str = "Customer: ") -> str:
    global _session

    try:
        if _session is None:
            _session = PromptSession(
                input=create_input(sys.stdin),
                output=create_output(sys.stdout)
            )

        return _session.prompt(message).strip()

    except Exception:
        print(message, end="", flush=True)
        return sys.stdin.readline().strip()