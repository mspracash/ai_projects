Author: Surya Muntha

SEO Intake CLI (AI Prototype)

Overview
This project is a Node.js command-line prototype for an SEO agency intake assistant.
It demonstrates how AI can help collect SEO issues, normalize them, classify them using
a knowledge graph, map them to services, and estimate pricing.

Main Capabilities
- Interactive SEO concern intake
- LLM-based normalization of user input
- Atomic symptom extraction
- Hierarchical concern classification
- Service recommendation
- Pricing calculation

Technology Stack
- Node.js
- LangGraph
- LangChain
- Ollama (local LLM runtime)
- phi4-mini model
- CLI tools: prompts, chalk, ora

Workflow

User Input
    ↓
Normalize Concern (LLM)
    ↓
Atomize into Symptoms (LLM)
    ↓
Classify Using Knowledge Graph
    ↓
Map to SEO Services
    ↓
Calculate Pricing
    ↓
Summary Output


Example CLI Session

Describe one SEO concern:
> keyword rankings dropped and traffic reduced

System output:

Atomic concern candidates:
 - average position / keyword rankings dropped
 - organic sessions/visits from search reduced

Classification path:

seo → seo.visibility → seo.visibility.rankings_down
seo → seo.visibility → seo.visibility.organic_traffic_down


Knowledge Graph

seo
├── visibility
│   ├── rankings_down
│   └── organic_traffic_down
│
├── technical
│   ├── indexing_issue
│   └── general_technical_issue


Installation

1. Clone the repository

git clone <repo-url>
cd seo_intake_cli

2. Install dependencies

npm install


Install Ollama

Download Ollama from:
https://ollama.com

Pull the model used by this project:
ollama pull phi4-mini

Start Ollama server:
ollama serve


Run the CLI

node index.js


Run Tests

node --test


Project Structure

seo_intake_cli

index.js
rootGraph.js
discoveryGraph.js
workflowNodes.js

knowledgeGraph.js
concernResolver.js

normalizer.js
atomizer.js

seoPrompts.js
seoLlm.js

pricing.js
services.js
prices.js

tests


Future Improvements

- Vector database integration (FAISS)
- Retrieval Augmented Generation (RAG)
- Negotiation engine for proposals
- Automated proposal generation
- Multi-agent workflow architecture


License

MIT License
