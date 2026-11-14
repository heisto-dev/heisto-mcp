# Release checks

- Official runtime TypeScript SDK: 1.32.2.
- Official MCP Inspector: 2.15.0.
- Source release: 1.0.1. Stable SDK and Inspector versions were
  checked against npm; both already match the latest stable releases.
- Release regression: runtime, package and manifest version agreement is tested.
- Current-release checks: application production build, ten focused MCP tests,
  standalone typecheck, build and three module privacy/version tests passed.
- Production: all five read-only tools passed official Inspector checks for
  this release. See PUBLICATION_PROOF.json for UTC observation times.
- Official Registry publisher: 1.8.9; release archive SHA-256 checked.
- Registry publisher validation: server.json accepted.
- Previous release baseline: TypeScript production build and 195 backend tests passed,
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
  from local build validation. Production HTTP domain authentication succeeded
  and xyz.heisto/arena version 1.0.1 is active in the Official MCP Registry.
  See PUBLICATION_PROOF.json for the production verification summary.

These are development checks, not an independent security audit.
