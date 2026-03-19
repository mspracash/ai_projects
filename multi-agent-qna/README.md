# Multi-Agent SEO Q&A System

A modular, multi-agent AI system designed to answer SEO and digital marketing questions using a combination of LLM reasoning, semantic retrieval, and deterministic orchestration.

---

## Overview

This system processes user input through a pipeline of specialized agents. It combines:

- LLM-based reasoning (via Ollama or local models)
- Hybrid retrieval (FAISS + BM25 through a Python backend)
- Deterministic orchestration (scheduler + state store)
- Event-driven architecture (producer → queue → composer)

---

## Architecture Flow

1. User input is received  
2. PartitionAgent splits input into:
   - intake (SEO-related)
   - non-intake (general conversation)  
3. Non-intake text is handled separately  
4. Intake text goes through IntakeAgent:
   - normalization
   - atomization
   - classification  
5. Scheduler dispatches classified items to:
   - KnowledgeAgent
   - AgencyAgent
   - NegotiationAgent  
6. Agents produce outputs into a shared OutputQueue  
7. ComposerAgent consumes queue and builds final response  
8. Final response is returned to user  

---

## Agents

### IntakeAgent
- Normalizes user input  
- Splits into atomic questions  
- Classifies each question into agent types  

### KnowledgeAgent
- Handles general SEO and marketing explanations  
- Uses LLM-based reasoning  

### AgencyAgent
- Handles services, offerings, and deliverables  
- Uses hybrid retrieval via Python backend  

### NegotiationAgent
- Handles pricing, discounts, and policies  
- Uses hybrid retrieval  

### ComposerAgent
- Consumes outputs from all agents  
- Produces a clean, merged final answer  

### PartitionAgent
- Separates conversational vs actionable content  

### NonIntakeAgent
- Handles greetings or general chat  

---

## Key Concepts

### Producer–Consumer Model

Agents do not write directly to output. Instead:

- Agents push results into OutputQueue  
- ComposerAgent consumes and builds the final response  

This avoids:
- interleaved output  
- race conditions  
- inconsistent responses  

---

### Hybrid Retrieval

Agency and Negotiation agents use:

- FAISS (semantic similarity)  
- BM25 (keyword relevance)  

Python backend is accessed via:

runSeoAgencySearch()

---

### Intake Pipeline

The intake pipeline converts raw input into structured tasks:

1. Normalization  
   Cleans input and removes noise  

2. Atomization  
   Breaks input into atomic questions  

3. Classification  
   Assigns each question to:
   - knowledge  
   - agency  
   - negotiation  

---

## Project Structure

multi-agent-qna/

agents/  
  IntakeAgent.js  
  KnowledgeAgent.js  
  AgencyAgent.js  
  NegotiationAgent.js  
  ComposerAgent.js  
  PartitionAgent.js  
  NonIntakeAgent.js  

app/  
  createRuntime.js  
  handleTurn.js  

bus/  
  scheduler.js  
  queryBus.js  
  runStateStore.js  
  outputQueue.js  

lib/  
  llmClient.js  
  pythonBridge.js  

prompts/  
  normalizationPrompt.js  
  atomizationPrompt.js  
  classificationPrompt.js  
  knowledgePrompt.js  

utils/  
  streamText.js  

index.js  

---

## Setup

### 1. Install dependencies

npm install

---

### 2. Setup Python backend

Navigate to your SEO retrieval project:

cd ../seo-agency

Test:

python retrieval_stdin.py < test_input.json

---

### 3. Configure environment

Create a .env file:

OLLAMA_URL=http://localhost:11434/api/generate  
MODEL=phi4-mini  

SEO_AGENCY_PYTHON=../seo-agency/venv/Scripts/python.exe  
SEO_AGENCY_SCRIPT=../seo-agency/retrieval_stdin.py  
SEO_AGENCY_CWD=../seo-agency  

---

### 4. Run the app

npm start

---

## Example Usage

Input:

Hi, what services do you offer and do you have discounts?

System behavior:

- Greeting is ignored  
- Two questions identified:
  - services → agency  
  - discounts → negotiation  
- Agents process in parallel  
- Composer merges results  

Output (simplified):

[agency] What services do you offer?  
- Local SEO Foundation  
- Google Business Profile Optimization  

[negotiation] Are there discounts?  
- Onboarding discounts may apply for new clients  

---

## Debugging Tips

### Normalization errors

If you see:

Normalization response missing normalized_text

Check raw LLM output by logging:

console.log(result)

---

### Python retrieval issues

Test directly:

python retrieval_stdin.py < test_input.json

---

### Empty responses

Input like:

Hello

Produces no intake items and is handled gracefully.

---

## Design Decisions

### Why Queue + Composer?

Without queue:
- multiple agents write to stdout  
- output becomes interleaved and messy  

With queue:
- agents push events  
- composer builds final output  
- clean and deterministic  

---

### Why Hybrid (LLM + Retrieval)?

LLM only:
- can hallucinate  

Retrieval only:
- lacks reasoning  

Hybrid:
- combines accuracy + reasoning  

---

## Future Improvements

- Streaming composed output  
- Priority scheduling  
- Retrieval caching  
- Multi-run concurrency  
- UI frontend  
- Prolog-based reasoning layer  

---

## Philosophy

This system follows a hybrid intelligence model:

- LLM → exploration  
- Agents → structure  
- Queue → control  
- Composer → synthesis  

---

## License

MIT (or your preferred license)

## Author
Surya Muntha