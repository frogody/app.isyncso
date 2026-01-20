# SYNC Agent Testing - Autonomous (Claude in Chrome)

This plan contains all tests that can be executed autonomously by Claude in Chrome without human involvement.

---

## Execution Instructions for Claude in Chrome

### Setup
1. Open Chrome DevTools Console (F12 → Console tab)
2. Navigate to app.isyncso.com
3. Ensure you're logged in with test account
4. Copy-paste test functions below and run them

### Environment Variables (paste once at start)
```javascript
const SUPABASE_URL = "https://sfxpmzicgpaxfntqleig.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4";
```

---

## Part 1: Chat API Testing

### Test Helper Function
```javascript
// Paste this first - it's the test runner
async function testSYNC(message, testId, expectedPatterns = []) {
  const sessionId = `auto-test-${Date.now()}`;

  console.log(`\n========== TEST ${testId} ==========`);
  console.log(`INPUT: ${message}`);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        message,
        sessionId,
        stream: false,
        context: { userId: 'test-user', companyId: 'test-company' }
      })
    });

    const data = await response.json();
    const text = data.response || data.text || data.error || 'NO_RESPONSE';

    console.log(`RESPONSE: ${text.substring(0, 300)}${text.length > 300 ? '...' : ''}`);

    // Checks
    const issues = [];

    // Silent bug check
    if (!text || text === 'NO_RESPONSE' || text.length < 10) {
      issues.push('SILENT_BUG');
    }

    // Follow-up check
    if (!/\?|ACTIONS|anything else|what.*next|should I|want me/i.test(text)) {
      issues.push('NO_FOLLOWUP');
    }

    // Expected pattern check
    for (const pattern of expectedPatterns) {
      if (!new RegExp(pattern, 'i').test(text)) {
        issues.push(`MISSING: ${pattern}`);
      }
    }

    if (issues.length === 0) {
      console.log('RESULT: ✅ PASS');
      return { pass: true, testId, text };
    } else {
      console.log(`RESULT: ❌ FAIL - ${issues.join(', ')}`);
      return { pass: false, testId, text, issues };
    }
  } catch (error) {
    console.log(`RESULT: ❌ ERROR - ${error.message}`);
    return { pass: false, testId, error: error.message };
  }
}

// Results collector
const testResults = { passed: 0, failed: 0, silent: 0, results: [] };

async function runTest(message, testId, patterns = []) {
  const result = await testSYNC(message, testId, patterns);
  testResults.results.push(result);
  if (result.pass) testResults.passed++;
  else {
    testResults.failed++;
    if (result.issues?.includes('SILENT_BUG')) testResults.silent++;
  }
  await new Promise(r => setTimeout(r, 1500)); // Rate limit
  return result;
}

function showResults() {
  console.log('\n====================================');
  console.log('       TEST RESULTS SUMMARY');
  console.log('====================================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`🔇 Silent Bugs: ${testResults.silent}`);
  console.log('====================================\n');

  if (testResults.failed > 0) {
    console.log('Failed Tests:');
    testResults.results.filter(r => !r.pass).forEach(r => {
      console.log(`  - ${r.testId}: ${r.issues?.join(', ') || r.error}`);
    });
  }
  return testResults;
}
```

---

## Part 2: Test Suites to Execute

### Suite 1: Greeting Tests
```javascript
async function runGreetingTests() {
  console.log('\n🔵 SUITE: GREETINGS\n');
  await runTest('Hi', 'CHAT-001', ['help|hi|hello']);
  await runTest('Hey SYNC, how are you?', 'CHAT-002');
  await runTest('What can you do?', 'CHAT-003', ['help|can|invoice|product']);
  await runTest('Good morning!', 'CHAT-004');
}
```

### Suite 2: Product Search Tests (Critical - Silent Bug Area)
```javascript
async function runProductTests() {
  console.log('\n🔵 SUITE: PRODUCT SEARCH (Silent Bug Critical)\n');
  await runTest('Show me products', 'CHAT-010');
  await runTest('Search for oneblade', 'CHAT-011');
  await runTest('Do we have any iPhones?', 'CHAT-012');
  await runTest('Find philips razors', 'CHAT-013');
  await runTest('What products are low on stock?', 'CHAT-014');
  await runTest('List all inventory', 'CHAT-015');
}
```

### Suite 3: Invoice/Proposal Tests
```javascript
async function runInvoiceTests() {
  console.log('\n🔵 SUITE: INVOICE/PROPOSAL\n');
  await runTest('Create an invoice', 'CHAT-020', ['who|which|client|for']);
  await runTest('Make a proposal for Acme Corp', 'CHAT-021');
  await runTest('Create an invoice for 10 oneblades for John at john@test.com', 'CHAT-022');
  await runTest('Show me unpaid invoices', 'CHAT-023');
  await runTest('List my proposals', 'CHAT-024');
}
```

### Suite 4: Financial Tests
```javascript
async function runFinanceTests() {
  console.log('\n🔵 SUITE: FINANCIAL\n');
  await runTest('How is the business doing?', 'CHAT-030');
  await runTest('What is my revenue this month?', 'CHAT-031');
  await runTest('Show me expenses', 'CHAT-032');
  await runTest('Get financial summary', 'CHAT-033');
}
```

### Suite 5: CRM/Pipeline Tests
```javascript
async function runCRMTests() {
  console.log('\n🔵 SUITE: CRM/PIPELINE\n');
  await runTest('Show me my pipeline', 'CHAT-040');
  await runTest('Add a new lead: Mike from TechCorp, mike@techcorp.io', 'CHAT-041');
  await runTest('List my prospects', 'CHAT-042');
  await runTest('Get pipeline stats', 'CHAT-043');
  await runTest('Find prospects in qualified stage', 'CHAT-044');
}
```

### Suite 6: Task Tests
```javascript
async function runTaskTests() {
  console.log('\n🔵 SUITE: TASKS\n');
  await runTest('What tasks do I have?', 'CHAT-050');
  await runTest('Create a task to follow up with client tomorrow', 'CHAT-051');
  await runTest('Show me overdue tasks', 'CHAT-052');
  await runTest('What is on my plate today?', 'CHAT-053');
}
```

### Suite 7: Integration Tests
```javascript
async function runIntegrationTests() {
  console.log('\n🔵 SUITE: INTEGRATIONS\n');
  await runTest('What integrations do I have?', 'CHAT-060');
  await runTest('Check my email', 'CHAT-061');
  await runTest('Show me my calendar', 'CHAT-062');
}
```

### Suite 8: Image Generation Tests
```javascript
async function runImageTests() {
  console.log('\n🔵 SUITE: IMAGE GENERATION\n');
  await runTest('Generate an image', 'CHAT-070', ['what|which|kind|product']);
  await runTest('Create a product photo of the OneBlade', 'CHAT-071');
}
```

### Suite 9: Edge Cases
```javascript
async function runEdgeCaseTests() {
  console.log('\n🔵 SUITE: EDGE CASES\n');
  await runTest('Creaet an invocie', 'CHAT-080'); // Typo test
  await runTest('What is the weather?', 'CHAT-081'); // Out of scope
  await runTest('asdfghjkl', 'CHAT-082'); // Gibberish
  await runTest('', 'CHAT-083'); // Empty
}
```

---

## Part 3: Run All Tests

### Execute Full Suite
```javascript
async function runAllChatTests() {
  console.log('====================================');
  console.log('  SYNC CHAT AUTOMATED TEST SUITE');
  console.log('  Started: ' + new Date().toISOString());
  console.log('====================================\n');

  // Reset results
  testResults.passed = 0;
  testResults.failed = 0;
  testResults.silent = 0;
  testResults.results = [];

  await runGreetingTests();
  await runProductTests();
  await runInvoiceTests();
  await runFinanceTests();
  await runCRMTests();
  await runTaskTests();
  await runIntegrationTests();
  await runImageTests();
  await runEdgeCaseTests();

  return showResults();
}

// RUN THIS TO EXECUTE ALL TESTS:
runAllChatTests();
```

---

## Part 4: Individual Silent Bug Detection

### Quick Silent Bug Check
```javascript
async function detectSilentBugs() {
  console.log('====================================');
  console.log('  SILENT BUG DETECTION');
  console.log('====================================\n');

  const silentProne = [
    'Show me products',
    'Search for oneblade',
    'List invoices',
    'Get pipeline stats',
    'Check my email',
    'What integrations do I have?',
    'Show me low stock',
    'List tasks'
  ];

  const results = [];

  for (const msg of silentProne) {
    const result = await testSYNC(msg, `SILENT-${silentProne.indexOf(msg)}`);
    if (!result.pass && result.issues?.includes('SILENT_BUG')) {
      results.push({ message: msg, ...result });
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n====================================');
  console.log(`  SILENT BUGS FOUND: ${results.length}`);
  console.log('====================================');

  results.forEach(r => console.log(`  ❌ "${r.message}"`));

  return results;
}

// RUN THIS FOR QUICK SILENT BUG CHECK:
detectSilentBugs();
```

---

## Part 5: Conversation Flow Test

### Multi-Turn Conversation
```javascript
async function testConversationFlow() {
  console.log('====================================');
  console.log('  CONVERSATION FLOW TEST');
  console.log('====================================\n');

  const sessionId = `conv-test-${Date.now()}`;

  const conversation = [
    'Hi SYNC',
    'I need to create an invoice',
    'For Acme Corp',
    '10 oneblades',
    'Yes, create it'
  ];

  for (const msg of conversation) {
    console.log(`\nUSER: ${msg}`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        message: msg,
        sessionId, // Same session for context
        stream: false,
        context: { userId: 'test-user', companyId: 'test-company' }
      })
    });

    const data = await response.json();
    const text = data.response || data.text || 'NO_RESPONSE';
    console.log(`SYNC: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n====================================');
  console.log('  Review conversation above for:');
  console.log('  1. Context maintained across turns');
  console.log('  2. No silent responses');
  console.log('  3. Natural flow progression');
  console.log('====================================');
}

// RUN THIS FOR CONVERSATION FLOW:
testConversationFlow();
```

---

## Part 6: UI Testing (Click-based)

### Test SYNC Chat UI
```javascript
async function testSYNCUI() {
  console.log('====================================');
  console.log('  SYNC UI TEST');
  console.log('====================================\n');

  // Navigate to SYNC page
  if (!window.location.pathname.includes('sync')) {
    console.log('Navigate to /SyncAgent page first');
    return;
  }

  // Find input field
  const input = document.querySelector('textarea[placeholder*="message"], input[placeholder*="message"], textarea, input[type="text"]');
  if (!input) {
    console.log('❌ Could not find message input');
    return;
  }

  // Find send button
  const sendBtn = document.querySelector('button[type="submit"], button:has(svg)');

  // Test messages
  const testMessages = [
    'Hi SYNC',
    'Show me products',
    'What can you help me with?'
  ];

  for (const msg of testMessages) {
    console.log(`\nTesting: "${msg}"`);

    // Type message
    input.value = msg;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Click send
    if (sendBtn) {
      sendBtn.click();
    } else {
      // Try Enter key
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }

    // Wait for response
    await new Promise(r => setTimeout(r, 5000));

    // Check for response in chat
    const messages = document.querySelectorAll('[class*="message"], [class*="chat"], [class*="response"]');
    console.log(`Messages in UI: ${messages.length}`);
  }

  console.log('\n✅ UI test complete - review chat visually');
}

// Navigate to SYNC page first, then run:
testSYNCUI();
```

---

## Execution Order for Claude in Chrome

1. **Setup**: Paste environment variables
2. **Paste test helper function**
3. **Run quick silent bug check**: `detectSilentBugs()`
4. **Run full test suite**: `runAllChatTests()`
5. **Run conversation flow**: `testConversationFlow()`
6. **Document results in console**

## Expected Outcomes

| Test Suite | Expected Pass Rate | Action if Failing |
|------------|-------------------|-------------------|
| Greetings | 100% | Check system prompt |
| Product Search | >90% | Silent bug fix needed |
| Invoice/Proposal | >90% | Check action execution |
| Financial | >95% | Check API responses |
| CRM/Pipeline | >90% | Check action execution |
| Tasks | >95% | Check task actions |
| Integrations | >80% | May need Composio setup |
| Image Gen | >90% | Check clarification flow |
| Edge Cases | >70% | Graceful degradation |

---

## Report Format

After running tests, copy this template to report results:

```
SYNC Chat Test Report
Date: [DATE]
Tester: Claude in Chrome

RESULTS:
- Total Tests: X
- Passed: X
- Failed: X
- Silent Bugs: X

SILENT BUG INSTANCES:
- [List any messages that got no response]

FAILED TESTS:
- CHAT-XXX: [reason]

RECOMMENDATIONS:
- [Based on failures]
```
