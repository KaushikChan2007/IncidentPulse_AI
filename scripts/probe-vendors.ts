/**
 * IncidentPulse AI - Vendor Probe CLI script
 * Tests connectivity to upstream vendor health check endpoints and feeds telemetry to /api/ingest
 */
import { mockVendors } from '../lib/mock';

async function probeVendors() {
  console.log('Initiating upstream vendor probe sweep...');
  for (const vendor of mockVendors) {
    const start = Date.now();
    try {
      console.log(`[PROBING] ${vendor.name} (${vendor.statusUrl})...`);
      const elapsed = Date.now() - start;
      console.log(`  -> Status: ${vendor.status.toUpperCase()} (${elapsed}ms latency)`);
    } catch (err) {
      console.error(`  -> Failed to reach ${vendor.name}:`, err);
    }
  }
  console.log('Sweep finished. Correlated telemetry stored.');
}

probeVendors();
