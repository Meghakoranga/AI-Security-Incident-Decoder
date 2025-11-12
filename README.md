# AI-Security-Incident-Decoder

## Overview

Technology generates  alerts and logs every day—cryptic messages that are hard to decipher under pressure. The AI Security Incident Decoder is a project I built to simplify this chaotic reality. With a clean web interface backed by a powerful AI language model, it takes any alert or log snippet and transforms it into an easy-to-understand diagnosis with clear next steps for remediation.

Powered by Cloudflare Workers and Durable Objects, this project is a serverless, ultra-fast solution that remembers past sessions and provides real-time analysis to help engineers and security teams resolve incidents faster.

---


## Features

- **AI-powered analysis** using Meta’s Llama 3.3 model hosted on Cloudflare Workers AI.
- **Session-based memory** using Durable Objects to track past incidents.
- **Serverless architecture** ensures global low latency and no infrastructure to manage.
- **Simple, responsive web UI** to paste alerts and instantly get clear explanations.

---

## Tech Stack

- **Cloudflare Workers** for serverless backend
- **Durable Objects** for state management
- **Workers AI** for AI-powered incident analysis
- **TypeScript** for type-safe development
- **HTML/JS** for frontend UI

---

## Setup & Usage

### Prerequisites

Before running this project locally or deploying, ensure you have:

- A Cloudflare account :([sign up here](https://dash.cloudflare.com/sign-up))
- Node.js (v16.13 or higher)
- npm (comes with Node.js)
- Wrangler CLI installed globally:  
 ```
npm install -g wrangler
```

### Local Development

You can run and test the Worker locally:

```
 wrangler deploy
```

This command outputs the public `.workers.dev` URL. Open it in your browser to use the full AI-powered incident decoder.

---

## How to Use

1. Copy and paste a technical alert or log message into the input box.
2. Click “Analyze.”
3. Receive a clear diagnosis, impact explanation, and suggested actions to remediate.

---

