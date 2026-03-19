function buildResponse({ intakeResult, nonIntakeResult }) {
  return [
    nonIntakeResult?.response_text,
    intakeResult?.final_text
  ]
    .filter((x) => x && x.trim())
    .join("\n\n");
}

export async function handleTurn(runtime, input, { onPhase } = {}) {
  if (onPhase) {
    onPhase("Partitioning request...");
  }

  const runId = `run-${Date.now()}`;
  const partitionResult = await runtime.partitionAgent.process(input);

  let nonIntakeResult = null;
  if (partitionResult.non_intake_text) {
    nonIntakeResult = await runtime.nonIntakeAgent.process(
      partitionResult.non_intake_text
    );
  }

  let intakeFinalText = "";

  if (partitionResult.intake_text) {
    if (onPhase) {
      onPhase("Normalizing and planning request...");
    }

    const intakePipelineResult = await runtime.intakeAgent.process(
      partitionResult.intake_text
    );
    const intakeItems = intakePipelineResult.items || [];

    if (intakeItems.length) {
      if (onPhase) {
        onPhase("Running agents...");
      }

      intakeFinalText = await runtime.runWithComposer(runId, intakeItems, {
        originalInput: partitionResult.intake_text,
        normalizedText: intakePipelineResult.normalized_text
      });
    }
  }

  if (onPhase) {
    onPhase("Composing final answer...");
  }

  return buildResponse({
    nonIntakeResult,
    intakeResult: { final_text: intakeFinalText }
  });
}