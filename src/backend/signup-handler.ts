/**
 * Rutherford Signup Handler
 *
 * Creates new Cordelia user profiles from Genesis onboarding data.
 * Handles validation, encryption, and L1 context generation.
 */

import { createHash } from 'crypto';
import { L1HotContextSchema } from './schema.js';

export interface SignupData {
  name: string;
  github_id?: string;
  username?: string;
  roles?: string[];
  org_name?: string;
  org_role?: string;
  style?: string[];
  key_refs?: string[];
  heroes?: string[];
  planning_mode?: 'critical' | 'important' | 'optional';
  verbosity?: 'minimal' | 'concise' | 'detailed';
  emoji?: boolean | string;
}

export interface StorageProvider {
  readL1(userId: string): Promise<any>;
  writeL1(userId: string, data: Buffer): Promise<void>;
}

export interface CryptoProvider {
  isUnlocked(): boolean;
  name: string;
  encrypt(plaintext: Buffer): Promise<any>;
}

export interface SessionStore extends Map<string, any> {}

export interface SignupHandlerConfig {
  storage: StorageProvider;
  crypto: CryptoProvider;
  sessions: SessionStore;
}

export interface SignupRequest {
  body: SignupData;
  signedCookies?: {
    cordelia_session?: string;
  };
}

export interface SignupResponse {
  status(code: number): this;
  json(data: any): void;
}

/**
 * Process signup data and create L1 Hot Context
 */
export async function processSignup(
  data: SignupData,
  config: SignupHandlerConfig,
  sessionId?: string
): Promise<{ success: boolean; user_id?: string; error?: string }> {
  try {
    const {
      name,
      github_id,
      username,
      roles = [],
      org_name,
      org_role,
      style = [],
      key_refs: rawKeyRefs = [],
      heroes = [],
      planning_mode = 'important',
      verbosity = 'concise',
      emoji: rawEmoji = false,
    } = data;

    // Convert emoji to boolean (might come as string from form)
    const emoji = rawEmoji === true || rawEmoji === 'true';

    // Transform key_refs to required format (author:title with lowercase/underscores)
    const key_refs = rawKeyRefs.map((ref: string) => {
      // If already in correct format, use as-is
      if (/^[a-z_]+:[a-z0-9_]+$/.test(ref)) return ref;
      // Otherwise, try to normalize it
      return ref.toLowerCase().replace(/[^a-z0-9:]/g, '_').replace(/_+/g, '_').replace(/(^_)|(_$)/g, '');
    }).filter((ref: string) => /^[a-z_]+:[a-z0-9_]+$/.test(ref));

    // Accept either github_id or username for user identification
    const userIdentifier = github_id || username;
    if (!name || !userIdentifier) {
      return { success: false, error: 'Name and username (or GitHub ID) are required' };
    }

    // Generate user ID from identifier
    const userId = userIdentifier.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Check if user already exists
    const existing = await config.storage.readL1(userId);
    if (existing) {
      return { success: false, error: 'User already exists' };
    }

    // Build the L1 hot context
    const now = new Date().toISOString();
    const orgs = org_name && org_name.toLowerCase() !== 'independent'
      ? [{ id: org_name.toLowerCase().replace(/\s+/g, '_'), name: org_name, role: org_role || 'member' }]
      : [];

    // Build notes from heroes if provided
    const notes: string[] = [];
    if (heroes.length > 0) {
      notes.push(`Heroes: ${heroes.join(', ')}`);
    }

    const newContext = {
      version: 1,
      updated_at: now,
      identity: {
        id: userId,
        name,
        roles,
        orgs,
        key_refs,
        style,
        github_id: github_id || userIdentifier,
        tz: 'UTC',
      },
      active: {
        project: null,
        sprint: null,
        focus: null,
        blockers: [],
        next: [],
        context_refs: [],
        notes,
      },
      prefs: {
        planning_mode,
        feedback_style: 'continuous' as const,
        verbosity,
        emoji,
        proactive_suggestions: true,
        auto_commit: false,
      },
      delegation: {
        allowed: true,
        max_parallel: 3,
        require_approval: ['git_push', 'destructive_operations', 'external_api_calls', 'file_delete'],
        autonomous: ['file_read', 'file_write', 'git_commit', 'code_execution_sandbox'],
      },
      ephemeral: {
        session_count: 1,
        current_session_start: now,
        last_session_end: null,
        last_summary: null,
        open_threads: [],
        vessel: null,
        integrity: {
          chain_hash: createHash('sha256').update(`genesis:${now}:${userId}`).digest('hex'),
          previous_hash: '0000000000000000000000000000000000000000000000000000000000000000',
          genesis: now,
        },
      },
    };

    // Validate against schema
    const validated = L1HotContextSchema.parse(newContext);

    // Write to file (encrypt if crypto is enabled)
    let fileContent: string;

    if (config.crypto.isUnlocked() && config.crypto.name !== 'none') {
      const plaintext = Buffer.from(JSON.stringify(validated, null, 2), 'utf-8');
      const encrypted = await config.crypto.encrypt(plaintext);
      fileContent = JSON.stringify(encrypted, null, 2);
    } else {
      fileContent = JSON.stringify(validated, null, 2);
    }

    await config.storage.writeL1(userId, Buffer.from(fileContent, 'utf-8'));

    // Update the session to link this user to their new Cordelia profile
    if (sessionId && config.sessions.has(sessionId)) {
      const session = config.sessions.get(sessionId)!;
      session.cordelia_user = userId;
      config.sessions.set(sessionId, session);
    }

    return { success: true, user_id: userId };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Create Express.js middleware handler for /api/signup endpoint
 */
export function createSignupHandler(config: SignupHandlerConfig) {
  return async (req: SignupRequest, res: SignupResponse) => {
    const sessionId = req.signedCookies?.cordelia_session;
    const result = await processSignup(req.body, config, sessionId);

    if (result.success) {
      res.json({ success: true, user_id: result.user_id });
    } else if (result.error === 'User already exists') {
      res.status(409).json({ error: result.error });
    } else {
      res.status(result.error === 'Name and username (or GitHub ID) are required' ? 400 : 500)
        .json({ error: result.error });
    }
  };
}
