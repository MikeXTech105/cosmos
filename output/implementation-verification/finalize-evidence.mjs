import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const out = 'output/implementation-verification/';
const hash = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const read = path => fs.readFileSync(out + path, 'utf8');
const log = path => ({ path: out + path, sha256: hash(out + path), modifiedAt: fs.statSync(out + path).mtime.toISOString() });
const captures = JSON.parse(read('browser-captures.json'));
for (const entry of captures.captures) {
  const path = out + 'screenshots/' + entry.file;
  entry.sha256 = hash(path);
  entry.capturedAt = fs.statSync(path).mtime.toISOString();
}
fs.writeFileSync(out + 'browser-captures.json', JSON.stringify(captures, null, 2));
const frontend = read('frontend-complete-tests.log');
const frontendTests = frontend.match(/Tests\s+(\d+) passed \((\d+)\)/);
const frontendFiles = frontend.match(/Test Files\s+(\d+) passed \((\d+)\)/);
if (!frontendTests || !frontendFiles || frontendTests[1] !== frontendTests[2] || frontendFiles[1] !== frontendFiles[2]) throw Error('Frontend complete pass summary missing');
const lint = read('frontend-complete-lint.log');
if (/\b(?:error|warning)\b/i.test(lint)) throw Error('Resolve/review frontend lint output before finalizing');
if (!/built in/.test(read('frontend-complete-build.log'))) throw Error('Frontend build success missing');
if (!/Build succeeded\./.test(read('backend-complete-build.log'))) throw Error('Backend build success missing');
const trxPath = 'backend-complete-unit/complete-unit.trx';
const trx = read(trxPath);
const counters = trx.match(/<Counters\s+([^>]+)/)?.[1] ?? '';
const attributes = Object.fromEntries([...counters.matchAll(/(\w+)="(\d+)"/g)].map(x => [x[1], Number(x[2])]));
if (!attributes.executed || attributes.failed || attributes.notExecuted) throw Error('Backend non-SQL gate missing/failed/skipped');
const migrationFiles = fs.readdirSync('backend/database/migrations').filter(x => x.startsWith('20261028_') && x.endsWith('.sql')).sort();
const migrationManifest = {
  createdAt: new Date().toISOString(), status: 'Prepared and SQL Server parser checked; NOT EXECUTED against SQL Server in this session',
  dependencies: ['backend/database/001_Full_Database_Setup.sql', 'backend/database/003_gst_integration_module.sql', 'Earlier ordered applicable migrations, including 20261027 production workspace foundations'],
  execution: 'backend/scripts/Test-CompleteImplementation.ps1', rollback: 'No destructive down migration supplied. Retained history requires approved application rollback/schema compatibility and backup-restore rehearsal.',
  files: migrationFiles.map(name => { const path = 'backend/database/migrations/' + name; return { path, sha256: hash(path), runtimeStatus: 'Not executed; user will run guarded scripts', parserEvidence: out + trxPath }; })
};
fs.writeFileSync(out + 'migration-manifest.json', JSON.stringify(migrationManifest, null, 2));
const status = execFileSync('git', ['ls-files', '--modified', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const paths = status.filter(path => !path.startsWith('output/') && fs.existsSync(path) && fs.statSync(path).isFile());
const sourceManifest = { createdAt: new Date().toISOString(), baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), files: [...new Set(paths)].sort().map(path => ({ path, sha256: hash(path) })) };
fs.writeFileSync(out + 'source-manifest.json', JSON.stringify(sourceManifest, null, 2));
const results = {
  createdAt: new Date().toISOString(), baselineCommit: sourceManifest.baselineCommit,
  implementationStatus: 'Delivered current working tree; no commit, merge, deployment or whole-release acceptance claimed',
  environment: { operatingSystem: 'Windows', node: execFileSync('node', ['--version'], { encoding: 'utf8' }).trim(), sdk: '.NET SDK 10.0.403', sqlEnvironment: 'Not used; user will execute prepared scripts later' },
  executed: {
    frontend: { command: 'node node_modules/vitest/vitest.mjs run --maxWorkers=4 (same worker bound as npm test)', testFilesPassed: Number(frontendFiles[1]), testsPassed: Number(frontendTests[1]), failed: 0, evidence: log('frontend-complete-tests.log') },
    frontendLint: { exitCode: 0, evidence: log('frontend-complete-lint.log') },
    frontendBuild: { exitCode: 0, evidence: log('frontend-complete-build.log') },
    backendBuild: { exitCode: 0, warnings: 12, warningScope: 'Existing NuGet advisory/pruning warnings; see exact build log', evidence: log('backend-complete-build.log') },
    backendNonSql: { ...attributes, evidence: log(trxPath), output: log('backend-complete-unit.log'), scope: 'Category!=SqlIntegration; mocks, pure logic, contracts and SQL syntax parsing are not persistence evidence' },
    operatorScriptSyntax: { status: 'PowerShell parser success; runtime SQL gates not executed' },
    browser: { artifact: out + 'browser-captures.json', console: out + 'browser-console.json', scope: 'Actual components with isolated synthetic data only; six widths, three themes, search failure/retry and keyboard selection', authenticatedPassClaimed: false },
  },
  priorAttempt: { artifact: out + 'frontend-parallel-attempt-tests.log', outcome: 'Six failures in parallel test/lint/build attempt: one reproducible inline-create focus/display defect corrected and regression-tested; other failures were timeouts. Bounded first run had944pass and one5s multi-route journey deadline; its unchanged assertions and real debounce windows now have a10s journey deadline. Final bounded4-worker run separately passed945/945.', boundedAttempt: out + 'frontend-bounded-first-tests.log' },
  unexecuted: [
    { gate: 'SQL fresh/upgrade/repeatability and real persistence/concurrency/conservation/rollback fixtures', reason: 'User requested prepared scripts and will run them later; no LocalDB or private disposable connection available to this session', runner: 'backend/scripts/Test-CompleteImplementation.ps1' },
    { gate: 'Ordinary-role authenticated end-to-end journeys and retained-company representative restore/application rollback', reason: 'No connected safe authenticated deployment or representative restored catalog used; bounded synthetic predecessor sentinel is prepared, not a company backup rehearsal' },
    { gate: 'GST sandbox session/extension/readback and statutory issuance', reason: 'No provider mutation executed; tax policy is explicitly deferred by user and generation remains blocked. Snapshot preparation is PendingPolicy' },
    { gate: 'Exact public website preview parity', reason: 'Public-site renderer/source is absent from this ERP repository; safe previews are implemented, production-site visual parity cannot be verified here' },
  ],
  traceability: { findings: 56, coverageRows: 125, scenarios: 44, artifacts: ['finding-tracker.json', 'coverage-tracker.json', 'acceptance-scenarios.json', 'scope-integrity.json', 'source-manifest.json', 'migration-manifest.json'] },
  guide: 'handoff/COSMOS_CLIENT_FLOW_GUIDE_GU.md',
};
fs.writeFileSync(out + 'verification-results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify({ frontend: results.executed.frontend.testsPassed, frontendFiles: results.executed.frontend.testFilesPassed, backendNonSql: attributes.passed, migrations: migrationFiles.length, sourceFiles: sourceManifest.files.length }));
