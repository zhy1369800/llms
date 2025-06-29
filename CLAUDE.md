# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `npm run build`: Build the project
- `npm run build:watch`: Build in watch mode
- `npm run dev`: Start development server with nodemon
- `npm start`: Run the built CJS server
- `npm run start:esm`: Run the built ESM server
- `npm test`: Run converter tests
- `npm run test:batch`: Run batch tool results fix tests
- `npm run test:batch-response`: Run batch tool response fix tests
- `npm run test:comprehensive`: Run comprehensive tool conversion tests

## Architecture
- The project is a universal LLM API transformation server, initially developed for the [claude-code-router](https://github.com/musistudio/claude-code-router).
- Uses Fastify for the server framework.
- Supports both CJS and ESM module formats.
- Includes tests for tool conversion and batch processing.
- Dependencies include Anthropic, OpenAI, and Google GenAI SDKs.