/**
 * Rutherford Frontend Exports
 *
 * Frontend utilities for Cordelia onboarding UI.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Get the complete Genesis HTML template
 * Useful for serving via Express or other HTTP frameworks
 */
export function getGenesisHTML(): string {
  const htmlPath = join(__dirname, 'genesis.html');
  return readFileSync(htmlPath, 'utf-8');
}

/**
 * Get the Genesis JavaScript code
 * Useful for serving as a separate static file
 */
export function getGenesisJS(): string {
  const jsPath = join(__dirname, 'genesis.js');
  return readFileSync(jsPath, 'utf-8');
}

/**
 * Frontend asset paths (relative to package root)
 */
export const ASSET_PATHS = {
  html: 'dist/frontend/genesis.html',
  js: 'dist/frontend/genesis.js',
};
