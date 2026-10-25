/**
 * End-to-end Verification Script
 * Runs ingestion, triggers sweep and verdict evaluation against cached data, and prints the verdict JSON.
 * Run: npx tsx scripts/test-engine.ts
 */
import { saveEvent } from '../lib/storage';
import { runCorrelationEngine } from '../lib/engine';

async function testEngineEndToEnd() {
  console.log('--- IncidentPulse AI Engine Test ---');

  // 1. Ingest test errors
  console.log('1. Ingesting test error event...');
  const saved = saveEvent({
    ts: new Date().toISOString(),
    service: 'identity-service',
    dependency: 'Auth0',
    endpoint: '/api/auth/callback',
    statusCode: 503,
    latencyMs: 1420,
    message: 'Auth0 /oauth/token 503 Service Unavailable upstream broker outage',
  });
  console.log(`   Event saved: ${saved.id}`);

  // 2. Trigger correlation engine sweep
  console.log('2. Running correlation engine sweep...');
  const result = await runCorrelationEngine({ scenario: 'auth0' });

  // 3. Print results
  console.log('3. Sweep completed!');
  console.log(`   Data Mode: ${result.mode}`);
  console.log(`   Attributed Cause: ${result.verdict.cause.toUpperCase()} (${result.verdict.vendor || 'None'})`);
  console.log(`   Formula Confidence Score: ${result.verdict.confidence}%`);
  console.log(`   Evidence count: ${result.verdict.evidence.length}`);

  console.log('\n--- VERDICT JSON OUTPUT ---');
  console.log(JSON.stringify(result.verdict, null, 2));

  console.log('\n--- VENDOR SCORES BREAKDOWN ---');
  result.scores.forEach((s) => {
    console.log(`- ${s.vendorName}: Total ${s.totalScore}/100 [Status: ${s.statusOverlapScore}/35, Timing: ${s.timingMatchScore}/30, Comm: ${s.communityScore}/15, Changelog: ${s.changelogScore}/10, Deploy: ${s.noDeployScore}/10]`);
  });

  console.log('\n✅ End-to-end test passed successfully.');
}

testEngineEndToEnd().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
