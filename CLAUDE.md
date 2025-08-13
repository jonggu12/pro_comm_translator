# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Korean workplace communication translator** (직장인 커뮤니케이션 번역기) built with Next.js App Router. It transforms emotional/unprofessional text into business-appropriate Korean language using OpenAI's Responses API with structured outputs.

**Core concept**: "내 속은 썩어도, 내 평판은 프로" - An AI communication coach that converts workplace emotions (anger, frustration, directness) into professional business language.

**Target users**: Korean office workers (20-40s) who need to convert emotional text into polite business communication for emails, reports, messenger, etc.

**Core functionality**: Users input emotional text → AI analyzes text automatically OR manual settings → professional Korean business text + improvement tips + learning explanations.

## Key Features

### Smart Mode (2-step process)
- **AI Analysis**: Automatically detects document purpose, intent, and politeness level
- **Confidence-based**: Only auto-applies when analysis confidence ≥ 0.7, otherwise asks for user confirmation
- **Backward compatibility**: Manual setting mode still available

### Model Selection
- **GPT-4o Mini**: Fast, efficient standard model (free users)
- **GPT-4o**: Premium quality model (premium users)
- **Usage limits**: Free 5/day, Premium 50/day (Mini), 10/day (4o)
- **Premium key system**: Demo key `premium_demo_2024` available

### Feedback System
- **Satisfaction collection**: Users rate results as 'satisfied/needs improvement'
- **Detailed feedback**: Categorized by tone/accuracy/naturalness/length
- **Data analysis**: Continuous AI prompt improvement via feedback data
- **Admin dashboard**: `/admin` page for feedback statistics and analysis

## Development Commands

```bash
# Install dependencies
pnpm i  # or npm i / yarn

# Development server
pnpm dev

# Build for production
pnpm build
pnpm start

# Linting
pnpm lint
```

## Environment Setup

```bash
cp .env.example .env.local
# Fill in OPENAI_API_KEY=sk-...
# Optionally set OPENAI_MODEL (defaults to gpt-4o-mini)
```

## Architecture

### API Endpoints
- **`POST /api/transform`**: Main text transformation with smart/manual modes
- **`POST /api/feedback`**: Feedback collection system for continuous improvement
- **`GET /api/feedback?key=ADMIN_KEY`**: Admin feedback data retrieval
- **Input/Output**: Validated with Zod schemas, structured JSON responses

### Core Components
- **2-step processing** (`lib/prompt.ts`): 1) AI analysis → 2) optimized transformation
- **Smart analysis**: Automatic detection of purpose/intent/politeness with confidence scoring
- **Manual fallback**: Traditional controls for precise user control
- **Model selection**: GPT-4o Mini (default) vs GPT-4o (premium quality)
- **Premium system** (`lib/premium.ts`): Key-based access to advanced features
- **Feedback tracking**: Satisfaction ratings and improvement suggestions

### Business Features
- **Free tier**: 5 requests/day, GPT-4o Mini only
- **Premium tier**: 50 requests/day (Mini), 10 requests/day (4o), advanced features
- **Admin analytics**: Feedback statistics and usage patterns
- **Continuous improvement**: AI prompt optimization based on user feedback

### Tech Stack
- Next.js 14 (App Router)
- TypeScript with strict config
- Tailwind CSS for styling
- OpenAI Responses API (structured outputs)
- Zod for runtime validation

### Key Files Structure
```
app/
  api/
    transform/route.ts         # 2-step AI process + model selection API
    feedback/route.ts          # Feedback collection/retrieval API
  admin/page.tsx               # Feedback management dashboard
  layout.tsx
  page.tsx                     # Smart mode + model selection UI
components/
  Controls.tsx                 # Smart mode + model selection controls
  Result.tsx                   # AI analysis results + feedback + model info
  Header.tsx
lib/
  prompt.ts                    # Analysis/transformation prompt functions
  schema.ts                    # Analysis results + feedback + model types
  premium.ts                   # Premium access management system
data/                          # Feedback data storage (gitignored)
  feedback/feedback.jsonl
public/
  templates.json
```

## Model Configuration & Premium System

- **Default**: `gpt-4o-mini` for cost/speed optimization
- **Premium**: `gpt-4o` for highest quality transformations
- **Access control**: Premium key system (`premium_demo_2024` for testing)
- **Usage limits**: Free (5/day Mini), Premium (50/day Mini + 10/day GPT-4o)

## Critical Development Notes

### Smart Mode Implementation
- **2-step process**: Analysis → Transformation for improved accuracy
- **Confidence threshold**: 0.7+ for auto-application, otherwise manual confirmation
- **Fallback support**: Traditional manual controls always available

### Feedback System
- **Real-time collection**: Satisfaction ratings and improvement categories
- **Admin analytics**: `/admin?key=ADMIN_KEY` for data analysis
- **Continuous improvement**: User feedback drives AI prompt optimization
- **Data storage**: JSONL format in `data/feedback/` (gitignored)

### Performance Optimization
- **Token management**: Track usage per model for cost control
- **Response time**: Monitor and optimize transformation speed
- **Quality metrics**: Compare Mini vs GPT-4o output quality