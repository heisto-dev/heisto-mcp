# Release checks

- Official runtime TypeScript SDK: 1.32.2.
- Official MCP Inspector: 2.15.0.
- Official Registry publisher: 1.8.9; release archive SHA-256 checked.
- Registry publisher validation: server.json accepted.
- Existing application: TypeScript production build and 195 backend tests passed,
  including nine focused MCP transport, privacy and rate-limit tests.
- Inspector output is attached with its UTC observation time and environment label.
  It is a development test using real available public records, not a production test.
- Empty development Mainnet lists were not replaced with fake agents. Practice
  templates were used for successful detail/history calls when no Mainnet row existed.
- No high or critical advisory was reported by the workspace package audit.
  The complete application still has moderate advisories in the existing
  Solana SDK dependency chain (stream-json via jayson). The MCP module does not
  add or publish the Solana signing SDK.
- The isolated public MCP package audit reported zero advisories at release.
- Public export uses an explicit file allowlist and checks content against runtime
  credential values without printing those values.
- HTTP domain proof, production activation and Registry publication are separate
  from local build validation. See the live endpoint for availability.

These are development checks, not an independent security audit.
