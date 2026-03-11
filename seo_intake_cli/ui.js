import chalk from "chalk";
import Table from "cli-table3";

export function printIntakeSummary(intake) {

  console.log(chalk.bold.cyan("\nIntake Summary\n"));

  const table = new Table({
    colWidths: [25, 50],
    wordWrap: true,
    style: {
        border: [], // Disable table borders
    }
  });

  table.push(
    [chalk.bold.yellow("Contact Name:"), intake.contactName],
    [chalk.bold.yellow("Phone:"), intake.phone],
    [chalk.bold.yellow("Email:"), intake.email],
    [chalk.bold.yellow("Business Name:"), intake.businessName],
     [chalk.bold.yellow("Business Address:"), intake.businessAddress],
    [chalk.bold.yellow("Business Description:"), intake.businessDescription]
  );

  console.log(table.toString());
}

export function printDiscoverySummary(state, knowledgeGraph){
 console.log(chalk.bold.cyan("\nDiscovery Summary\n"));   

 const table = new Table({
    colWidths: [25, 45],
    wordWrap: true,
    style: {
        border: [], // Disable table borders
    }
  });

  for(const id of state.resolvedConcernIds){
    const concern = knowledgeGraph.getConcern(id);
    table.push([chalk.bold.yellow(concern?.label || id), concern?.atomicSentence || ""]);
 }

 if(state.resolvedConcernIds.length === 0){
    console.log(chalk.red("No concerns were resolved."));
 }

 console.log(table.toString());
}

export function printServiceSummary(state, graph){
    console.log(chalk.bold.cyan("\n\nService Summary\n"));
    console.log(chalk.bold.yellow("Recommended Services\n"));

    const table = new Table({
        colWidths: [35, 12],
        wordWrap: true,
        style: {
            border: [], // Disable table borders
        }
    });

    for (const item of state.priceItems) {

    const concernIds = graph.getConcernsForService(item.serviceId);

    const addressedConcerns = concernIds
      .filter(id => state.resolvedConcernIds.includes(id))
      .map(id => graph.getConcern(id)?.label);

    let serviceText = chalk.bold.yellow(item.label);

    if (addressedConcerns.length > 0) {
      const bullets = addressedConcerns
        .map(c => `   • ${c}`)
        .join("\n");

      serviceText += "\n" + chalk.gray(bullets);
    }

    table.push([
      serviceText,
      chalk.white(`$${item.price.toFixed(2)}`)
    ]);
  }

    if(state.priceItems.length === 0){
        console.log(chalk.red("No services matched the identified concerns."));
    }

    console.log(table.toString());
    console.log(chalk.bold.magenta(`Total Estimated Price: $${state.totalCost.toFixed(2)}`));
}