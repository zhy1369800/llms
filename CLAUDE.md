# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a universal LLM API transformation server that acts as middleware to standardize requests and responses between different LLM providers (Anthropic, Gemini, Deepseek, etc.). It uses a modular transformer system to handle provider-specific API formats.

## Key Architecture Components

1. **Transformers**: Each provider has a dedicated transformer class that implements:
   - `transformRequestIn`: Converts the provider's request format to a unified format
   - `transformResponseIn`: Converts the provider's response format to a unified format
   - `transformRequestOut`: Converts the unified request format to the provider's format
   - `transformResponseOut`: Converts the unified response format back to the provider's format
   - `endPoint`: Specifies the API endpoint for the provider

2. **Unified Formats**: Requests and responses are standardized using `UnifiedChatRequest` and `UnifiedChatResponse` types.

3. **Streaming Support**: Handles real-time streaming responses for providers, converting chunked data into a standardized format.

## Common Development Commands

- **Install dependencies**: `pnpm install` or `npm install`
- **Development mode**: `npm run dev` (Uses nodemon + tsx for hot-reloading)
- **Build**: `npm run build` (Outputs to dist/cjs and dist/esm)
- **Lint**: `npm run lint` (Runs ESLint on src directory)
- **Start server (CJS)**: `npm start` or `node dist/cjs/server.cjs`
- **Start server (ESM)**: `npm run start:esm` or `node dist/esm/server.mjs`

## Project Structure

- `src/server.ts`: Main entry point
- `src/transformer/`: Provider-specific transformer implementations
- `src/services/`: Core services (config, llm, provider, transformer)
- `src/types/`: TypeScript type definitions
- `src/utils/`: Utility functions
- `src/api/`: API routes and middleware

## Path Aliases

- `@` is mapped to the `src` directory, use `import xxx from '@/xxx'`

## Build System

The project uses esbuild for building, with separate CJS and ESM outputs. The build script is located at `scripts/build.ts`.

## Adding New Transformers

1. Create a new transformer file in `src/transformer/`
2. Implement the required transformer methods
3. Export the transformer in `src/transformer/index.ts`
4. The transformer will be automatically registered at startup