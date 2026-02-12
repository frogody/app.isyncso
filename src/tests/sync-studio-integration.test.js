/**
 * Sync Studio E2E Integration Smoke Tests
 *
 * Phase 11 validation: verifies that all Sync Studio frontend pages
 * and backend edge functions are correctly wired up.
 *
 * Covers:
 *   1. Import verification - all 6 page modules resolve
 *   2. Route registration - PAGES map includes every Sync Studio entry
 *   3. Edge function existence - all 9 edge function dirs have index.ts
 *   4. Component render smoke - each default export is a callable function
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// 1. IMPORT VERIFICATION
//    Confirm every Sync Studio page module can be imported without throwing.
// ---------------------------------------------------------------------------

describe('Sync Studio page imports', () => {
  it('imports SyncStudioHome without errors', async () => {
    const mod = await import('../pages/SyncStudioHome');
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
  });

  it('imports SyncStudioImport without errors', async () => {
    const mod = await import('../pages/SyncStudioImport');
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
  });

  it('imports SyncStudioDashboard without errors', async () => {
    const mod = await import('../pages/SyncStudioDashboard');
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
  });

  it('imports SyncStudioPhotoshoot without errors', async () => {
    const mod = await import('../pages/SyncStudioPhotoshoot');
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
  });

  it('imports SyncStudioResults without errors', async () => {
    const mod = await import('../pages/SyncStudioResults');
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
  });

  it('imports SyncStudioReturn without errors', async () => {
    const mod = await import('../pages/SyncStudioReturn');
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. ROUTE REGISTRATION
//    Verify the PAGES map in src/pages/index.jsx contains all Sync Studio
//    entries. We read the file as text and check for the expected keys.
// ---------------------------------------------------------------------------

describe('Sync Studio route registration in PAGES map', () => {
  const indexPath = path.resolve(__dirname, '../pages/index.jsx');
  let indexContent;

  // Read once before tests
  try {
    indexContent = fs.readFileSync(indexPath, 'utf-8');
  } catch {
    indexContent = null;
  }

  const expectedPageKeys = [
    'SyncStudioHome',
    'SyncStudioImport',
    'SyncStudioDashboard',
    'SyncStudioPhotoshoot',
    'SyncStudioResults',
    'SyncStudioReturn',
  ];

  it('index.jsx file exists and is readable', () => {
    expect(indexContent).not.toBeNull();
    expect(indexContent.length).toBeGreaterThan(0);
  });

  expectedPageKeys.forEach((key) => {
    it(`PAGES map includes "${key}"`, () => {
      // Match the key as a property in the PAGES object (e.g. "SyncStudioHome: SyncStudioHome")
      const pattern = new RegExp(`\\b${key}\\s*:\\s*${key}\\b`);
      expect(indexContent).toMatch(pattern);
    });
  });

  // Verify route declarations exist (<Route path="/SyncStudio..." .../>)
  const expectedRoutes = [
    '/SyncStudioHome',
    '/SyncStudioImport',
    '/SyncStudioDashboard',
    '/SyncStudioPhotoshoot',
    '/SyncStudioResults',
    '/SyncStudioReturn',
  ];

  expectedRoutes.forEach((routePath) => {
    it(`Route declaration exists for "${routePath}"`, () => {
      expect(indexContent).toContain(`path="${routePath}"`);
    });
  });

  it('imports all 6 Sync Studio page modules', () => {
    const importStatements = [
      'import SyncStudioHome from',
      'import SyncStudioImport from',
      'import SyncStudioDashboard from',
      'import SyncStudioPhotoshoot from',
      'import SyncStudioResults from',
      'import SyncStudioReturn from',
    ];
    importStatements.forEach((stmt) => {
      expect(indexContent).toContain(stmt);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. EDGE FUNCTION EXISTENCE
//    Verify all 9 Sync Studio edge function directories exist and each
//    contains an index.ts entry point.
// ---------------------------------------------------------------------------

describe('Sync Studio edge function directories', () => {
  const functionsRoot = path.resolve(__dirname, '../../supabase/functions');

  const edgeFunctions = [
    'sync-studio-import-catalog',
    'sync-studio-generate-plans',
    'sync-studio-approve-plan',
    'sync-studio-update-plan',
    'sync-studio-execute-photoshoot',
    'sync-studio-job-progress',
    'sync-studio-regenerate-shot',
    'sync-studio-export-zip',
    'sync-studio-publish-bol',
  ];

  edgeFunctions.forEach((fnName) => {
    describe(`${fnName}`, () => {
      const fnDir = path.join(functionsRoot, fnName);
      const indexFile = path.join(fnDir, 'index.ts');

      it('directory exists', () => {
        expect(fs.existsSync(fnDir)).toBe(true);
      });

      it('contains index.ts', () => {
        expect(fs.existsSync(indexFile)).toBe(true);
      });

      it('index.ts is non-empty', () => {
        const stat = fs.statSync(indexFile);
        expect(stat.size).toBeGreaterThan(0);
      });
    });
  });

  it('has exactly 9 sync-studio edge functions', () => {
    const dirs = fs.readdirSync(functionsRoot).filter((d) =>
      d.startsWith('sync-studio-')
    );
    expect(dirs).toHaveLength(9);
  });
});

// ---------------------------------------------------------------------------
// 4. COMPONENT RENDER SMOKE
//    Each page default export should be a function (React component).
//    We verify typeof and ensure they can be called conceptually.
// ---------------------------------------------------------------------------

describe('Sync Studio component export types', () => {
  it('SyncStudioHome default export is a function', async () => {
    const mod = await import('../pages/SyncStudioHome');
    expect(typeof mod.default).toBe('function');
    expect(mod.default.name || mod.default.displayName).toBeTruthy();
  });

  it('SyncStudioImport default export is a function', async () => {
    const mod = await import('../pages/SyncStudioImport');
    expect(typeof mod.default).toBe('function');
    expect(mod.default.name || mod.default.displayName).toBeTruthy();
  });

  it('SyncStudioDashboard default export is a function', async () => {
    const mod = await import('../pages/SyncStudioDashboard');
    expect(typeof mod.default).toBe('function');
    expect(mod.default.name || mod.default.displayName).toBeTruthy();
  });

  it('SyncStudioPhotoshoot default export is a function', async () => {
    const mod = await import('../pages/SyncStudioPhotoshoot');
    expect(typeof mod.default).toBe('function');
    expect(mod.default.name || mod.default.displayName).toBeTruthy();
  });

  it('SyncStudioResults default export is a function', async () => {
    const mod = await import('../pages/SyncStudioResults');
    expect(typeof mod.default).toBe('function');
    expect(mod.default.name || mod.default.displayName).toBeTruthy();
  });

  it('SyncStudioReturn default export is a function', async () => {
    const mod = await import('../pages/SyncStudioReturn');
    expect(typeof mod.default).toBe('function');
    expect(mod.default.name || mod.default.displayName).toBeTruthy();
  });
});
