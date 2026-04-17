import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box

from app import run_pipeline
from evals import evaluate_all

app = typer.Typer()
console = Console()


def print_section(title: str):
    console.print(f"\n[bold cyan]=== {title} ===[/bold cyan]")


@app.command()
def run(query: str):
    """Run a single query through the pipeline"""

    console.print(Panel.fit("Running Agentic Pipeline", style="bold green"))

    result = run_pipeline(query)

    # ROUTE
    print_section("Routing")
    console.print(f"[yellow]Route:[/yellow] {result['route']}")
    console.print(result["route_explanation"]["reason"])

    # RETRIEVAL
    print_section("Retrieval")
    table = Table(box=box.SIMPLE_HEAVY)
    table.add_column("Doc ID", style="magenta")
    table.add_column("Score", style="green")

    for doc in result["trace"]["events"][1]["metadata"]["scored_docs"]:
        table.add_row(doc["doc_id"], str(doc["score"]))

    console.print(table)

    # RESPONSE
    print_section("Response")
    console.print(Panel(result["response"], style="bold white"))

    # RULES
    print_section("Applied Rules")
    for rule in result["applied_rules"]:
        console.print(f"[green][/green] {rule}")

    # TRACE SUMMARY
    print_section("Trace Summary")
    for event in result["trace"]["events"]:
        console.print(
            f"[blue]{event['stage']}[/blue] "
            f"({event['duration_ms']} ms)"
        )


@app.command()
def eval():
    """Run full evaluation suite"""

    console.print(Panel.fit("Running Evaluation Suite", style="bold blue"))

    report = evaluate_all()

    # SUMMARY TABLE
    table = Table(title="Evaluation Summary", box=box.ROUNDED)

    table.add_column("Metric", style="cyan")
    table.add_column("Score", style="green")

    for k, v in report["summary"].items():
        table.add_row(k, f"{v:.3f}")

    console.print(table)

    # PER CASE DETAILS
    for case in report["results"]:
        console.print(
            Panel(
                f"[bold]{case['case_id']}[/bold]\n"
                f"Query: {case['query']}\n"
                f"Route: {case['actual_route']}\n"
                f"Precision@2: {case['retrieval_precision_at_2']:.2f}\n"
                f"Recall@2: {case['retrieval_recall_at_2']:.2f}\n"
                f"MRR: {case['retrieval_mrr']:.2f}\n"
                f"Routing Acc: {case['routing_accuracy']:.2f}\n"
                f"Response Score: {case['response_overall_score']:.2f}",
                title="Case Result",
                style="magenta",
            )
        )


if __name__ == "__main__":
    app()