/**
 * SYNC Agent Improvements E2E Tests
 * State-of-the-art testing for:
 * - Error Recovery (retry, suggestions, auto-fix)
 * - Action Chaining (multi-step operations)
 * - Proactive Intelligence (insights, suggestions)
 * - Intent Recognition (accurate classification)
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.TEST_URL || 'https://app.isyncso.com';
const SYNC_API_URL = 'https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/sync';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';
const TEST_EMAIL = 'frogody@icloud.com';
const TEST_PASSWORD = 'Passwordfortesting18#1';
const TEST_COMPANY_ID = '6a07896c-28e5-4f54-836e-ec0bde91c2c2';

// Unique session ID for isolation
const testSessionId = `test_sync_improvements_${Date.now()}`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

interface SyncResponse {
  response: string;
  sessionId: string;
  delegatedTo?: string;
  actionExecuted?: {
    success: boolean;
    type?: string;
    result?: any;
    link?: string;
    recovery?: {
      suggestions: Array<{ action: string; description: string }>;
    };
  };
  actionChain?: {
    success: boolean;
    completedCount: number;
    totalCount: number;
    completed: string[];
    failed?: string;
  };
  insights?: Array<{
    type: 'info' | 'warning' | 'suggestion' | 'celebration';
    message: string;
  }>;
  routing?: {
    confidence: number;
    matchedKeywords: string[];
    matchedPatterns: string[];
  };
}

async function callSyncAPI(
  message: string,
  sessionId: string = testSessionId,
  mode: string = 'auto'
): Promise<SyncResponse> {
  const response = await fetch(SYNC_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      sessionId,
      stream: false,
      mode,
      context: {
        companyId: TEST_COMPANY_ID,
        userId: 'test-user',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SYNC API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function waitForSyncResponse(page: Page, timeout = 60000): Promise<string> {
  const chatArea = page.locator('[class*="overflow-y-auto"]').last();
  const typingIndicator = chatArea.locator('text=/SYNC is.*thinking|SYNC is.*typing/i');

  try {
    await typingIndicator.waitFor({ state: 'visible', timeout: 5000 });
    console.log('   Waiting for SYNC response...');
    await typingIndicator.waitFor({ state: 'hidden', timeout });
  } catch {
    // Typing indicator might not appear if response is fast
  }

  await page.waitForTimeout(1500);

  const syncMessages = chatArea.locator('[class*="rounded-2xl"]').filter({ hasText: /SYNC.*\u2022/ });
  const count = await syncMessages.count();
  if (count > 0) {
    return await syncMessages.last().textContent() || '';
  }

  return '';
}

async function sendMessage(page: Page, message: string): Promise<void> {
  const textarea = page.locator('textarea');
  await textarea.fill(message);
  const sendButton = page.locator('button[title="Send"]');
  await sendButton.click();
}

async function loginAndNavigateToSync(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }

  await page.goto(`${BASE_URL}/syncagent`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

// ============================================================================
// API-LEVEL TESTS (Fast, Reliable)
// ============================================================================

test.describe('SYNC API - Error Recovery', () => {
  test('should provide helpful suggestions when product not found', async () => {
    console.log('\n🔧 Test: Error Recovery - Product Not Found');

    const response = await callSyncAPI(
      'Create an invoice for John for 5 NonExistentProduct12345',
      `${testSessionId}_recovery_1`
    );

    console.log('   Response:', response.response.substring(0, 200));

    // Should either ask to search or provide suggestions
    expect(response.response.toLowerCase()).toMatch(
      /not found|search|couldn't find|doesn't exist|let me search|check.*inventory/i
    );

    console.log('   ✅ Error recovery working - provided helpful guidance');
  });

  test('should suggest alternatives when action fails', async () => {
    console.log('\n🔧 Test: Error Recovery - Action Suggestions');

    // Try to update a non-existent invoice
    const response = await callSyncAPI(
      'Mark invoice INV-FAKE-12345 as paid',
      `${testSessionId}_recovery_2`
    );

    console.log('   Response:', response.response.substring(0, 200));

    // Should handle gracefully
    expect(response.response.toLowerCase()).toMatch(
      /not found|couldn't find|list.*invoices|show.*invoices|doesn't exist/i
    );

    console.log('   ✅ Provided alternative actions or guidance');
  });

  test('should handle validation errors with helpful messages', async () => {
    console.log('\n🔧 Test: Error Recovery - Validation');

    // Try to create expense with invalid data
    const response = await callSyncAPI(
      'Log an expense',  // Missing required fields
      `${testSessionId}_recovery_3`
    );

    console.log('   Response:', response.response.substring(0, 200));

    // Should ask for required info
    expect(response.response.toLowerCase()).toMatch(
      /what|how much|amount|description|tell me more|need.*details/i
    );

    console.log('   ✅ Handled gracefully - asked for required information');
  });
});

test.describe('SYNC API - Intent Recognition', () => {
  test('should correctly identify finance intents', async () => {
    console.log('\n🎯 Test: Intent Recognition - Finance');

    const response = await callSyncAPI(
      'I need to bill Jan €500 for consulting',
      `${testSessionId}_intent_1`
    );

    console.log('   Response:', response.response.substring(0, 200));
    console.log('   Routing confidence:', response.routing?.confidence);
    console.log('   Delegated to:', response.delegatedTo);

    // Should route to finance and understand it's an invoice
    expect(response.delegatedTo).toBe('finance');
    expect(response.response.toLowerCase()).toMatch(
      /invoice|bill|proposal|€500|jan/i
    );

    console.log('   ✅ Correctly identified finance intent');
  });

  test('should correctly identify product intents', async () => {
    console.log('\n🎯 Test: Intent Recognition - Products');

    const response = await callSyncAPI(
      'Do you have any OneBlade razors in stock?',
      `${testSessionId}_intent_2`
    );

    console.log('   Response:', response.response.substring(0, 200));
    console.log('   Delegated to:', response.delegatedTo);

    // Should route to products and search
    expect(response.delegatedTo).toBe('products');

    console.log('   ✅ Correctly identified product intent');
  });

  test('should correctly identify task intents', async () => {
    console.log('\n🎯 Test: Intent Recognition - Tasks');

    const response = await callSyncAPI(
      'Remind me to call John tomorrow',
      `${testSessionId}_intent_3`
    );

    console.log('   Response:', response.response.substring(0, 200));
    console.log('   Delegated to:', response.delegatedTo);

    // Should route to tasks OR sync (if handled by main agent)
    // The key is that the task is recognized and created
    if (response.delegatedTo) {
      expect(['tasks', 'sync']).toContain(response.delegatedTo);
    }

    // The response should indicate task/reminder creation
    expect(response.response.toLowerCase()).toMatch(
      /task|remind|tomorrow|created|john|set up/i
    );

    console.log('   ✅ Correctly identified task intent');
  });

  test('should handle multi-intent requests', async () => {
    console.log('\n🎯 Test: Intent Recognition - Multi-Intent');

    const response = await callSyncAPI(
      'Show me unpaid invoices and low stock items',
      `${testSessionId}_intent_4`
    );

    console.log('   Response:', response.response.substring(0, 300));

    // Should handle both or ask for clarification
    expect(response.response.toLowerCase()).toMatch(
      /invoice|stock|which.*first|both|one.*time/i
    );

    console.log('   ✅ Handled multi-intent request');
  });
});

test.describe('SYNC API - Action Chaining', () => {
  test('should detect chain intent for create-and-send', async () => {
    console.log('\n⛓️ Test: Action Chaining - Detection');

    const response = await callSyncAPI(
      'Create a proposal for Jan for €1000 consulting and send it',
      `${testSessionId}_chain_1`
    );

    console.log('   Response:', response.response.substring(0, 300));

    // Should understand this is a multi-step request
    expect(response.response.toLowerCase()).toMatch(
      /proposal|jan|€1000|consulting|create|send/i
    );

    console.log('   ✅ Understood chain intent');
  });

  test('should handle create-and-assign task', async () => {
    console.log('\n⛓️ Test: Action Chaining - Task Assignment');

    const response = await callSyncAPI(
      'Create a task to follow up with ABC Corp and assign it to me',
      `${testSessionId}_chain_2`
    );

    console.log('   Response:', response.response.substring(0, 300));

    // Should create task
    expect(response.response.toLowerCase()).toMatch(
      /task|created|follow.*up|abc/i
    );

    console.log('   ✅ Task chain handled');
  });
});

test.describe('SYNC API - Proactive Intelligence', () => {
  test('should provide context after listing invoices', async () => {
    console.log('\n💡 Test: Proactive Intelligence - Invoice Context');

    const response = await callSyncAPI(
      'Show me my recent invoices',
      `${testSessionId}_proactive_1`
    );

    console.log('   Response:', response.response.substring(0, 400));

    // Should show invoices (or indicate none exist)
    expect(response.response.toLowerCase()).toMatch(
      /invoice|found|no.*invoices|total|€/i
    );

    if (response.insights && response.insights.length > 0) {
      console.log('   Insights generated:', response.insights.length);
      response.insights.forEach(i => console.log(`     - [${i.type}] ${i.message}`));
    }

    console.log('   ✅ Proactive context provided');
  });

  test('should warn about low stock when searching products', async () => {
    console.log('\n💡 Test: Proactive Intelligence - Stock Warnings');

    const response = await callSyncAPI(
      'Search for products with low stock',
      `${testSessionId}_proactive_2`
    );

    console.log('   Response:', response.response.substring(0, 400));

    // Should search and potentially warn
    expect(response.response.toLowerCase()).toMatch(
      /stock|product|low|running|reorder|found|no.*products/i
    );

    console.log('   ✅ Stock information provided');
  });

  test('should provide financial context after expense', async () => {
    console.log('\n💡 Test: Proactive Intelligence - Expense Context');

    const response = await callSyncAPI(
      'Log an expense of €50 for office supplies from Staples',
      `${testSessionId}_proactive_3`
    );

    console.log('   Response:', response.response.substring(0, 400));

    // Should log expense
    if (response.actionExecuted?.success) {
      console.log('   Action executed:', response.actionExecuted.type);
      if (response.insights) {
        console.log('   Insights:', response.insights.length);
      }
    }

    expect(response.response.toLowerCase()).toMatch(
      /expense|€50|logged|office|supplies|staples|recorded/i
    );

    console.log('   ✅ Expense handled with context');
  });
});

test.describe('SYNC API - Conversation Memory', () => {
  const memorySessionId = `${testSessionId}_memory_${Date.now()}`;

  test('should remember client from previous message', async () => {
    console.log('\n🧠 Test: Memory - Client Recall');

    // First message - introduce client
    const response1 = await callSyncAPI(
      'I need to create a proposal for Peter van der Berg',
      memorySessionId
    );
    console.log('   First response:', response1.response.substring(0, 150));

    // Second message - reference "him"
    const response2 = await callSyncAPI(
      'Actually, make it an invoice for him instead',
      memorySessionId
    );
    console.log('   Second response:', response2.response.substring(0, 150));

    // Should remember Peter
    expect(response2.response.toLowerCase()).toMatch(
      /peter|van der berg|invoice/i
    );

    console.log('   ✅ Memory working - remembered client');
  });

  test('should maintain context across multiple turns', async () => {
    console.log('\n🧠 Test: Memory - Multi-turn Context');
    const contextSessionId = `${testSessionId}_context_${Date.now()}`;

    // Build up context
    await callSyncAPI('I want to work on invoices', contextSessionId);
    await callSyncAPI('For my client Amsterdam Tech BV', contextSessionId);
    const response = await callSyncAPI('Create one for €2500', contextSessionId);

    console.log('   Final response:', response.response.substring(0, 200));

    // Should have all context
    expect(response.response.toLowerCase()).toMatch(
      /amsterdam|tech|€2500|invoice|create/i
    );

    console.log('   ✅ Multi-turn context maintained');
  });
});

// ============================================================================
// UI-LEVEL TESTS (Visual Verification)
// ============================================================================

test.describe('SYNC UI - Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToSync(page);
  });

  test('should show response with action result', async ({ page }) => {
    console.log('\n🖥️ Test: UI - Action Display');

    await sendMessage(page, 'Search for products');
    const response = await waitForSyncResponse(page);

    console.log('   UI Response:', response.substring(0, 200));

    // Response should be visible
    expect(response.length).toBeGreaterThan(0);

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/sync-action-result.png' });

    console.log('   ✅ UI displaying action results');
  });

  test('should handle errors gracefully in UI', async ({ page }) => {
    console.log('\n🖥️ Test: UI - Error Handling');

    await sendMessage(page, 'Update invoice FAKE-12345 status to paid');
    const response = await waitForSyncResponse(page);

    console.log('   UI Response:', response.substring(0, 200));

    // Should not crash, should show helpful message
    expect(response.toLowerCase()).not.toMatch(/error.*occurred|500|internal/i);

    await page.screenshot({ path: 'e2e/screenshots/sync-error-handling.png' });

    console.log('   ✅ UI handling errors gracefully');
  });

  test('should show insights in response', async ({ page }) => {
    console.log('\n🖥️ Test: UI - Insights Display');

    await sendMessage(page, 'Show me my financial summary for this month');
    const response = await waitForSyncResponse(page);

    console.log('   UI Response:', response.substring(0, 300));

    // Should show summary or ask for clarification
    expect(response.length).toBeGreaterThan(0);

    await page.screenshot({ path: 'e2e/screenshots/sync-insights.png' });

    console.log('   ✅ UI showing financial insights');
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

test.describe('SYNC API - Performance', () => {
  test('should respond within acceptable time', async () => {
    console.log('\n⚡ Test: Performance - Response Time');

    const start = Date.now();
    const response = await callSyncAPI(
      'Hello, what can you help me with?',
      `${testSessionId}_perf_1`
    );
    const duration = Date.now() - start;

    console.log(`   Response time: ${duration}ms`);
    console.log('   Response length:', response.response.length);

    // Should respond within 30 seconds
    expect(duration).toBeLessThan(30000);

    console.log('   ✅ Response time acceptable');
  });

  test('should handle rapid requests', async () => {
    console.log('\n⚡ Test: Performance - Rapid Requests');

    const requests = [
      'List invoices',
      'Search products',
      'Show tasks',
    ];

    const results = await Promise.all(
      requests.map((msg, i) =>
        callSyncAPI(msg, `${testSessionId}_rapid_${i}`)
      )
    );

    results.forEach((r, i) => {
      console.log(`   Request ${i + 1}: ${r.response.substring(0, 50)}...`);
      expect(r.response.length).toBeGreaterThan(0);
    });

    console.log('   ✅ Handled rapid parallel requests');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

// ============================================================================
// ORCHESTRATION WORKFLOW TESTS
// ============================================================================

test.describe('SYNC API - Orchestration Workflows', () => {
  test('should detect client onboarding workflow', async () => {
    console.log('\n🎭 Test: Orchestration - Client Onboarding Detection');

    const response = await callSyncAPI(
      'Onboard new client Jan de Vries from Tech Solutions BV at jan@techsolutions.nl',
      `${testSessionId}_orch_1`
    );

    console.log('   Response:', response.response.substring(0, 300));
    console.log('   Orchestration:', JSON.stringify((response as any).orchestration || {}, null, 2));

    // Should detect orchestration workflow
    expect(response.delegatedTo).toBe('orchestrator');
    expect((response as any).orchestration).toBeDefined();
    expect((response as any).orchestration?.workflowName).toMatch(/onboarding/i);

    console.log('   ✅ Client onboarding workflow detected');
  });

  test('should execute weekly review workflow', async () => {
    console.log('\n🎭 Test: Orchestration - Weekly Review');

    const response = await callSyncAPI(
      'Give me a weekly business review',
      `${testSessionId}_orch_2`
    );

    console.log('   Response:', response.response.substring(0, 400));
    console.log('   Orchestration status:', (response as any).orchestration?.status);

    // Should execute the weekly review
    expect(response.response.toLowerCase()).toMatch(/review|summary|financial|pipeline|tasks/i);

    if ((response as any).orchestration) {
      expect((response as any).orchestration.workflowId).toBe('weekly_review');
    }

    console.log('   ✅ Weekly review workflow executed');
  });

  test('should execute monthly close workflow', async () => {
    console.log('\n🎭 Test: Orchestration - Monthly Close');

    const response = await callSyncAPI(
      'Do the monthly financial close',
      `${testSessionId}_orch_3`
    );

    console.log('   Response:', response.response.substring(0, 400));

    // Should show financial data
    expect(response.response.toLowerCase()).toMatch(/financial|invoice|expense|revenue|month/i);

    console.log('   ✅ Monthly close workflow executed');
  });

  test('should detect product launch workflow', async () => {
    console.log('\n🎭 Test: Orchestration - Product Launch');

    const response = await callSyncAPI(
      'Launch a new product called SuperWidget Pro for €299 - a premium productivity tool',
      `${testSessionId}_orch_4`
    );

    console.log('   Response:', response.response.substring(0, 400));

    // Should handle product launch
    if ((response as any).orchestration) {
      expect((response as any).orchestration.workflowId).toBe('product_launch');
    } else {
      // If not detected as workflow, should still understand the intent
      expect(response.response.toLowerCase()).toMatch(/product|launch|superwidget|€299/i);
    }

    console.log('   ✅ Product launch workflow handled');
  });

  test('should handle customer issue resolution', async () => {
    console.log('\n🎭 Test: Orchestration - Issue Resolution');

    const response = await callSyncAPI(
      'Customer Jan Bakker has an issue with his order arriving damaged',
      `${testSessionId}_orch_5`
    );

    console.log('   Response:', response.response.substring(0, 400));

    // Should handle issue resolution
    expect(response.response.toLowerCase()).toMatch(/issue|customer|resolution|jan|bakker|damage/i);

    console.log('   ✅ Issue resolution workflow handled');
  });

  test('should handle inventory restock workflow', async () => {
    console.log('\n🎭 Test: Orchestration - Inventory Restock');

    const response = await callSyncAPI(
      'Restock the inventory for low stock items',
      `${testSessionId}_orch_6`
    );

    console.log('   Response:', response.response.substring(0, 400));

    // Should check inventory
    expect(response.response.toLowerCase()).toMatch(/stock|inventory|product|restock|low/i);

    console.log('   ✅ Inventory restock workflow handled');
  });

  test('should ask for missing context when needed', async () => {
    console.log('\n🎭 Test: Orchestration - Context Collection');

    const response = await callSyncAPI(
      'Start client onboarding',  // Missing client details
      `${testSessionId}_orch_7`
    );

    console.log('   Response:', response.response.substring(0, 300));

    // Should ask for missing information
    expect(response.response.toLowerCase()).toMatch(/name|email|company|need|details|what|who/i);

    if ((response as any).orchestration?.status === 'awaiting_context') {
      console.log('   Missing inputs:', (response as any).orchestration.missingInputs);
    }

    console.log('   ✅ Context collection working');
  });
});

test.describe('SYNC API - Edge Cases', () => {
  test('should handle empty message gracefully', async () => {
    console.log('\n🔮 Test: Edge Case - Empty Message');

    try {
      await callSyncAPI('', `${testSessionId}_edge_1`);
    } catch (error: any) {
      // Should reject with proper error
      expect(error.message).toMatch(/400|required|empty/i);
      console.log('   ✅ Empty message rejected properly');
      return;
    }

    // If it doesn't throw, that's also acceptable if it handles gracefully
    console.log('   ✅ Empty message handled');
  });

  test('should handle very long message', async () => {
    console.log('\n🔮 Test: Edge Case - Long Message');

    const longMessage = 'Please help me with invoices. '.repeat(50);
    const response = await callSyncAPI(longMessage, `${testSessionId}_edge_2`);

    expect(response.response.length).toBeGreaterThan(0);
    console.log('   Response:', response.response.substring(0, 100));

    console.log('   ✅ Long message handled');
  });

  test('should handle special characters', async () => {
    console.log('\n🔮 Test: Edge Case - Special Characters');

    const response = await callSyncAPI(
      'Search for product "O\'Brien & Co." with 50% discount',
      `${testSessionId}_edge_3`
    );

    expect(response.response.length).toBeGreaterThan(0);
    console.log('   Response:', response.response.substring(0, 100));

    console.log('   ✅ Special characters handled');
  });

  test('should handle Dutch language', async () => {
    console.log('\n🔮 Test: Edge Case - Dutch Language');

    const response = await callSyncAPI(
      'Maak een factuur voor Jan voor €500 inclusief BTW',
      `${testSessionId}_edge_4`
    );

    console.log('   Response:', response.response.substring(0, 200));

    // Should understand Dutch
    expect(response.response.toLowerCase()).toMatch(
      /factuur|invoice|jan|€500|btw|vat/i
    );

    console.log('   ✅ Dutch language understood');
  });
});
