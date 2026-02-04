# Rutherford

The Rutherford onboarding system for Cordelia - a conversational user profile creation experience.

## Overview

Rutherford is the guitar-wielding guide who helps new Cordelia users create their persistent memory profiles through a conversational flow. Named with a nod to Robert Fripp and King Crimson, Rutherford makes the onboarding process feel like a jam session rather than a form-filling exercise.

## What's Included

- **Frontend Components**: Conversational UI with step-based flow, countdown timers, and interactive inputs
- **Backend Handler**: Profile creation endpoint with validation and encryption support
- **Schema Definitions**: TypeScript schemas for L1 Hot Context using Zod

## Installation

```bash
npm install @seed-drill/rutherford
```

## Usage

### Backend (Express.js)

```typescript
import express from 'express';
import { createSignupHandler } from '@seed-drill/rutherford/backend';
import { L1HotContextSchema } from '@seed-drill/rutherford/schema';

const app = express();

// Add the signup route
app.post('/api/signup', createSignupHandler({
  storage: yourStorageProvider,
  crypto: yourCryptoProvider,
  sessions: yourSessionStore,
}));
```

### Frontend (HTML)

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="path/to/rutherford/styles.css">
</head>
<body>
  <div id="genesis-container"></div>
  <script type="module" src="path/to/rutherford/genesis.js"></script>
</body>
</html>
```

Or use the complete HTML template:

```typescript
import { getGenesisHTML } from '@seed-drill/rutherford/frontend';

app.get('/genesis', (req, res) => {
  res.send(getGenesisHTML());
});
```

## Features

- **Conversational Flow**: 17-step guided questionnaire with Rutherford as the host
- **Multiple Setup Modes**: Genesis (full onboarding), Upload (existing profile), or Bare (minimal account)
- **Smart Inputs**: Different input types - select, multiselect, tags, and text
- **Countdown Timers**: 60-second timeouts per question with auto-skip defaults
- **Profile Generation**: Creates validated L1 Hot Context with identity, preferences, and delegation rules
- **Encryption Support**: Optional AES-256-GCM encryption for sensitive data
- **Session Linking**: Integrates with session management for authenticated users

## Profile Data Collected

- **Identity**: Name, GitHub ID, organization, roles
- **Style**: Working preferences, planning mode, verbosity
- **References**: Formative books/works, inspirational figures
- **Preferences**: Emoji usage, planning mode, feedback style

## License

MIT
