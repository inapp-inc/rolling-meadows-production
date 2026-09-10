// Extracts the prototype's case-workflow catalog and risk-domain families
// (Docs/ui/js/services/*.js) into JSON the React mock layer can import.
//
//   node scripts/extract-workflows.mjs
//
// The prototype defines these as browser IIFEs hanging off a global `RM`, so we
// evaluate them in a VM with just enough of a stub to run, then read the result.
// Localisation is skipped here on purpose — the React `t()` layer applies the
// same `workflow.<scopeId>.*` keys at render time, exactly like the prototype.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..');
const repoRoot = resolve(webRoot, '..', '..');
const protoRoot = join(repoRoot, 'Docs', 'ui', 'js');
const outDir = join(webRoot, 'src', 'mock', 'generated');

const sandbox = { window: {}, navigator: { language: 'en' } };
sandbox.globalThis = sandbox;
sandbox.window.RM = {};
sandbox.RM = sandbox.window.RM;
vm.createContext(sandbox);

function run(relPath) {
  const source = readFileSync(join(protoRoot, relPath), 'utf8');
  vm.runInContext(source, sandbox, { filename: relPath });
}

run('services/caseWorkflowService.js');

const workflows = sandbox.RM.CaseWorkflow.listWorkflows();
const defaultWorkflow = sandbox.RM.CaseWorkflow.forSubcategory('__none__');

// The family/domain maps are plain closure vars in caseFormService.js rather
// than exports, so splice a capture statement in just before the IIFE closes.
const formSource = readFileSync(join(protoRoot, 'services', 'caseFormService.js'), 'utf8');
const closeIndex = formSource.lastIndexOf('})();');
if (closeIndex === -1) throw new Error('could not find IIFE close in caseFormService.js');

const captureStmt = `
globalThis.__captured = {
  familyBySubcategory: FAMILY_BY_SUBCATEGORY,
  domains: {
    senior: SENIOR_DOMAINS,
    in_home: IN_HOME_DOMAINS,
    nutrition: NUTRITION_DOMAINS,
    parenting: PARENTING_DOMAINS,
    mental_health: MENTAL_HEALTH_DOMAINS,
    employment: EMPLOYMENT_DOMAINS,
    general: GENERAL_DOMAINS
  }
};
`;

const injected = formSource.slice(0, closeIndex) + captureStmt + formSource.slice(closeIndex);
vm.runInContext(injected, sandbox, { filename: 'caseFormService.js' });

const captured = sandbox.__captured;

mkdirSync(outDir, { recursive: true });

const payload = {
  defaultWorkflow: { subcategoryId: 'default', ...defaultWorkflow },
  workflows,
  familyBySubcategory: captured.familyBySubcategory,
  domainsByFamily: captured.domains,
};

writeFileSync(join(outDir, 'workflows.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(`wrote workflows.json — ${workflows.length} subcategory workflows`);
console.log(`  families: ${Object.keys(captured.domains).join(', ')}`);
console.log(`  subcategory→family entries: ${Object.keys(captured.familyBySubcategory).length}`);
