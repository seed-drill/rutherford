/**
 * Rutherford Schema Definitions
 *
 * L1 Hot Context Schema for Cordelia user profiles.
 * Dense, machine-optimized format for persistent memory.
 */

import { z } from 'zod';

// Key reference format: namespace:identifier
const KeyRefSchema = z.string().regex(/^[a-z_]+:[a-z0-9_]+$/);

// Identity core - who is this human
export const IdentitySchema = z.object({
  id: z.string(),
  name: z.string(),
  roles: z.array(z.string()),
  orgs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
  })),
  key_refs: z.array(KeyRefSchema).describe('Foundational references: author:work format'),
  style: z.array(z.string()).describe('Communication and working style markers'),
  tz: z.string().optional().describe('Timezone'),
  github_id: z.string().optional().describe('GitHub username for OAuth login'),
  email: z.string().optional().describe('Email address'),
  api_key: z.string().optional().describe('Per-user API key for CLI uploads'),
  interests: z.array(z.string()).optional().describe('User interests and hobbies'),
  heroes: z.array(z.string()).optional().describe('Inspirational figures'),
});

// Active state - current work context
export const ActiveStateSchema = z.object({
  project: z.string().nullable(),
  sprint: z.number().nullable(),
  focus: z.string().nullable().describe('Current primary focus'),
  blockers: z.array(z.string()),
  next: z.array(z.string()).describe('Immediate next actions'),
  context_refs: z.array(z.string()).describe('Relevant file paths or URLs'),
  sprint_plan: z.record(z.string(), z.string()).optional().describe('Sprint overview: s1, s2, etc.'),
  notes: z.array(z.string()).optional().describe('Ad-hoc notes and learnings'),
  context_bindings: z.record(z.string(), z.string()).optional().describe('Map of directory path -> group_id. Scopes group memory visibility by working directory.'),
});

// Preferences - how we work together
export const PreferencesSchema = z.object({
  planning_mode: z.enum(['critical', 'important', 'optional']),
  feedback_style: z.enum(['continuous', 'batched', 'end_of_task']),
  verbosity: z.enum(['minimal', 'concise', 'detailed']),
  emoji: z.boolean(),
  proactive_suggestions: z.boolean(),
  auto_commit: z.boolean().describe('Auto-commit on session end'),
});

// Delegation rules - how sub-agents should behave
export const DelegationSchema = z.object({
  allowed: z.boolean(),
  max_parallel: z.number(),
  require_approval: z.array(z.string()).describe('Actions requiring human approval'),
  autonomous: z.array(z.string()).describe('Actions that can proceed without approval'),
});

// Integrity block - cryptographic identity continuity
export const IntegritySchema = z.object({
  chain_hash: z.string().describe('SHA256(previous_hash + session_count + content_hash)'),
  previous_hash: z.string().describe('Chain hash from previous session'),
  genesis: z.string().datetime().describe('Identity birth timestamp'),
});

// Culture ship vessel names for session character
export const VesselSchema = z.enum([
  'GSV Sleeper Service',
  'GSV Just Read The Instructions',
  'GCU Grey Area',
  'GSV So Much For Subtlety',
  'ROU Frank Exchange Of Views',
  'GSV Quietly Confident',
]);

// Ephemeral memory - autobiographical/session continuity
export const EphemeralSchema = z.object({
  session_count: z.number().int().min(1).describe('Total sessions since genesis'),
  current_session_start: z.string().datetime().describe('When this session began'),
  last_session_end: z.string().datetime().nullable().describe('When previous session ended'),
  last_summary: z.string().nullable().describe('Brief summary of last session'),
  open_threads: z.array(z.string()).describe('Unfinished work from last session'),
  vessel: VesselSchema.nullable().describe('Culture ship name matching session character'),
  integrity: IntegritySchema,
});

// L1 Hot Context - loaded every session
export const L1HotContextSchema = z.object({
  version: z.literal(1),
  updated_at: z.string().datetime(),
  identity: IdentitySchema,
  active: ActiveStateSchema,
  prefs: PreferencesSchema,
  delegation: DelegationSchema,
  ephemeral: EphemeralSchema.optional().describe('Autobiographical memory - added S7'),
});

export type L1HotContext = z.infer<typeof L1HotContextSchema>;
export type Identity = z.infer<typeof IdentitySchema>;
export type ActiveState = z.infer<typeof ActiveStateSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type Delegation = z.infer<typeof DelegationSchema>;
export type Ephemeral = z.infer<typeof EphemeralSchema>;
export type Integrity = z.infer<typeof IntegritySchema>;
export type Vessel = z.infer<typeof VesselSchema>;
