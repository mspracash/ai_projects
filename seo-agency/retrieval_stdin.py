import json
import sys
from retrieval.search import search


def main():
    try:
        payload = json.load(sys.stdin)

        query = payload.get("query", "")
        k = int(payload.get("k", 5))

        results = search(query, k)

        sys.stdout.write(json.dumps({
            "ok": True,
            "results": results
        }, ensure_ascii=True))
        sys.stdout.flush()

    except Exception as e:
        sys.stdout.write(json.dumps({
            "ok": False,
            "error": str(e)
        }, ensure_ascii=True))
        sys.stdout.flush()
        sys.exit(1)


if __name__ == "__main__":
    main()