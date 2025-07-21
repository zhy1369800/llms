# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev`: Starts the development server with hot-reloading.
- `npm run build`: Builds the project for production.
- `npm run lint`: Lints the source code.
- `npm run start`: Starts the production server.

## Architecture

This project is a universal LLM API transformation server. It acts as a middleware to standardize requests and responses between different LLM providers (e.g., Anthropic, Gemini, OpenAI).

- **Transformers**: The core of the architecture is the transformer system in `src/transformer`. Each LLM provider has its own transformer file (e.g., `src/transformer/anthropic.transformer.ts`) that handles the conversion between the provider-specific API format and a unified format defined in `src/types/llm.ts`.
- **Server**: The main server logic is in `src/server.ts`, which uses Fastify to handle requests.
- **Configuration**: Environment variables and configuration are managed in `src/services/config.ts`, which supports `.env` files.
- **Path Aliases**: The path alias `@` is mapped to the `src` directory.
