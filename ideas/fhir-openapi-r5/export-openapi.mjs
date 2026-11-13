#!/usr/bin/env node
// Offline exporter; the caller owns the selected metadata and output files.
import { open, writeFile } from 'node:fs/promises';
import { capabilityOpenApi } from './fhir-openapi.mjs';

async function main() {
  if (process.argv.length !== 4) throw new Error('Usage: node export-openapi.mjs <metadata.json> <new-output.json>');
  const file = await open(process.argv[2], 'r');
  let input;
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error('Input must be a file no larger than 8 MiB.');
    input = await file.readFile({encoding: 'utf8'});
    if (Buffer.byteLength(input) > 8 * 1024 * 1024) throw new Error('Input exceeds 8 MiB.');
  } finally { await file.close(); }
  const result = capabilityOpenApi(input);
  await writeFile(process.argv[3], JSON.stringify(result.document, null, 2) + '\n', {flag:'wx'});
  console.log(JSON.stringify({status:'PASS', omitted:result.omitted, scope:result.scope}));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
