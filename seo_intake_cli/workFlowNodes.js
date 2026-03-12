// Author: Surya Muntha

import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";

import { normalizeSeoConcern } from "./normalizer.js";
import { atomizeConcern } from "./atomizer.js";
import { resolveConcernWithTree } from "./concernResolver.js";
import { calculateTotal } from "./pricing.js";
import {
  printIntakeSummary,
  printDiscoverySummary,
  printServiceSummary
} from "./ui.js";

export function createWorkflowNodes(deps = {}) {
  const {
    promptsImpl = prompts,
    normalizeSeoConcernImpl = normalizeSeoConcern,
    atomizeConcernImpl = atomizeConcern,
    resolveConcernWithTreeImpl = resolveConcernWithTree,
    printIntakeSummaryImpl = printIntakeSummary,
    printDiscoverySummaryImpl = printDiscoverySummary,
    printServiceSummaryImpl = printServiceSummary
  } = deps;

  async function intakeNode(state) {
    const response = await promptsImpl(
      [
        { type: "text", name: "contactName", message: "Contact Name:" },
        { type: "text", name: "phone", message: "Phone Number:" },
        { type: "text", name: "email", message: "Email Address:" },
        { type: "text", name: "businessName", message: "Business Name:" },
        { type: "text", name: "businessAddress", message: "Business Address:" },
        { type: "text", name: "businessDescription", message: "Business Description:" }
      ],
      {
        onCancel: () => {
          console.log(chalk.red("\nIntake cancelled. Exiting."));
          process.exit(0);
        }
      }
    );

    const cleaned = Object.fromEntries(
      Object.entries(response).map(([k, v]) => [k, v?.trim?.() || v])
    );

    const nextState = {
      ...cleaned,
      phase: "discovery"
    };

    printIntakeSummaryImpl({ ...state, ...nextState });
    console.log(chalk.bold.yellow("\nConcern Discovery\n"));

    return nextState;
  }

  async function askConcernNode() {
    const response = await promptsImpl(
      {
        type: "text",
        name: "concern",
        message: "Describe one SEO concern (type 'done' when finished):"
      },
      {
        onCancel: () => {
          console.log(chalk.red("\nDiscovery cancelled. Exiting."));
          process.exit(0);
        }
      }
    );

    const rawConcern = (response.concern || "").trim();

    if (!rawConcern) {
      console.log(chalk.red("\nNo concern entered."));
      return {
        currentConcern: "",
        isDiscoveryDone: false
      };
    }

    if (rawConcern.toLowerCase() === "done") {
      console.log(chalk.green("\nFinished entering concerns."));
      return {
        currentConcern: "",
        isDiscoveryDone: true
      };
    }

    return {
      currentConcern: rawConcern,
      isDiscoveryDone: false
    };
  }

  async function normalizeConcernNode(state) {
    if (!state.currentConcern) {
      return {};
    }

    const spinner = ora("Normalizing concern...").start();
    const normalizedConcern = await normalizeSeoConcernImpl(state.currentConcern);
    spinner.succeed("Concern normalized.");

    console.log(chalk.cyan(`\nOriginal concern: ${state.currentConcern}`));
    console.log(chalk.gray(`Normalized concern: ${normalizedConcern}`));

    return { normalizedConcern };
  }

  async function atomizeConcernNode(state) {
    const text = state.normalizedConcern || state.currentConcern;
    if (!text) {
      return {};
    }

    const spinner = ora("Atomizing concern...").start();
    const atomized = await atomizeConcernImpl(text);
    spinner.succeed("Concern atomized.");

    console.log(chalk.yellow("Atomic concern candidates:"));
    for (const s of atomized.atomic_sentences || []) {
      console.log(chalk.gray(` -${s}`));
    }

    return {
      currentAtomicConcerns: atomized.atomic_sentences || []
    };
  }

  async function resolveAtomicConcernsNode(state, { knowledgeGraph }) {
    const atomicConcerns = state.currentAtomicConcerns || [];
    if (!atomicConcerns.length) {
      return {
        currentConcern: "",
        normalizedConcern: "",
        currentAtomicConcerns: []
      };
    }

    const nextConcernMessages = [...(state.concernMessages || []), state.currentConcern];
    const nextAtomicConcernCandidates = [
      ...(state.atomicConcernCandidates || []),
      ...atomicConcerns
    ];
    const nextResolvedConcernIds = [...(state.resolvedConcernIds || [])];

    for (const atomicConcern of atomicConcerns) {
      const spinner = ora(`Resolving atomic concern: ${atomicConcern}`).start();

      const { resolvedConcernId, path, scoringTrace } =
        await resolveConcernWithTreeImpl(atomicConcern, knowledgeGraph);

      const resolvedConcern = resolvedConcernId
        ? knowledgeGraph.getConcern(resolvedConcernId)
        : null;

      spinner.succeed("Atomic concern resolved.");

      console.log(chalk.yellow(`Atomic concern:${atomicConcern}`));

      if (resolvedConcern) {
        if (!nextResolvedConcernIds.includes(resolvedConcern.id)) {
          nextResolvedConcernIds.push(resolvedConcern.id);
        }

        console.log(chalk.green(`Resolved concern: ${resolvedConcern.label}`));
        console.log(chalk.gray(`Tree path: ${path.join(" -> ")}`));
      } else {
        console.log(chalk.red("No matching resolved concern found."));
        console.log(chalk.gray(`Tree path: ${path.join(" -> ")}`));
      }

      for (const step of scoringTrace || []) {
        console.log(chalk.gray(`Scoring at ${step.nodeId}:`));
        for (const s of step.scores) {
          console.log(chalk.gray(`  -${s.id}: ${s.confidence.toFixed(2)}`));
        }
      }

      console.log();
    }

    return {
      concernMessages: nextConcernMessages,
      atomicConcernCandidates: nextAtomicConcernCandidates,
      resolvedConcernIds: nextResolvedConcernIds,
      currentConcern: "",
      normalizedConcern: "",
      currentAtomicConcerns: []
    };
  }

  function mapServicesNode(state, { knowledgeGraph }) {
    const matchedServiceIds = Array.from(
      new Set(
        (state.resolvedConcernIds || []).flatMap((id) =>
          knowledgeGraph.getServicesForConcern(id)
        )
      )
    );

    return {
      matchedServiceIds,
      phase: "pricing"
    };
  }

  function priceServicesNode(state, { knowledgeGraph }) {
    const priceItems = knowledgeGraph.getPriceItemsForServices(
      state.matchedServiceIds || []
    );

    const totalCost = calculateTotal(priceItems);

    return {
      priceItems,
      totalCost,
      phase: "summary"
    };
  }

  function summaryNode(state, { knowledgeGraph }) {
    printDiscoverySummaryImpl(state, knowledgeGraph);
    printServiceSummaryImpl(state, knowledgeGraph);

    return {
      phase: "done"
    };
  }

  return {
    intakeNode,
    askConcernNode,
    normalizeConcernNode,
    atomizeConcernNode,
    resolveAtomicConcernsNode,
    mapServicesNode,
    priceServicesNode,
    summaryNode
  };
}