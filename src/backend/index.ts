/**
 * Rutherford Backend Exports
 *
 * Backend utilities for Cordelia user profile creation.
 */

export {
  createSignupHandler,
  processSignup,
  type SignupData,
  type SignupHandlerConfig,
  type SignupRequest,
  type SignupResponse,
  type StorageProvider,
  type CryptoProvider,
  type SessionStore,
} from './signup-handler';

export {
  L1HotContextSchema,
  IdentitySchema,
  ActiveStateSchema,
  PreferencesSchema,
  DelegationSchema,
  EphemeralSchema,
  IntegritySchema,
  VesselSchema,
  type L1HotContext,
  type Identity,
  type ActiveState,
  type Preferences,
  type Delegation,
  type Ephemeral,
  type Integrity,
  type Vessel,
} from './schema';
