// Test Digital Signature Persistence and Invoice Print Rendering
const assert = require('node:assert');

async function main() {
  console.log('--- Testing Digital Signature Flow ---');

  // 1. Authenticate as Business Owner
  const loginRes = await fetch('http://127.0.0.1:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@rmstorvix.com', password: 'DemoOwner@2026!' })
  });
  assert.strictEqual(loginRes.status, 200, 'Login must succeed');
  const cookie = loginRes.headers.get('set-cookie');
  assert.ok(cookie, 'Cookie must be received');
  console.log('  ✓ Owner Authenticated');

  // 2. Fetch /settings HTML
  const setRes = await fetch('http://127.0.0.1:8080/settings', { headers: { 'Cookie': cookie } });
  assert.strictEqual(setRes.status, 200);
  const setHtml = await setRes.text();
  assert.ok(setHtml.includes('id="sigPadCanvas"'), 'Settings must include canvas');
  assert.ok(setHtml.includes('name="signatory_name"'), 'Settings must include signatory_name');
  assert.ok(setHtml.includes('Company Rubber Stamp / Seal'), 'Settings must include seal');
  console.log('  ✓ Digital Signature UI verified on /settings');

  // 3. Save Signature and Official Stamp
  const sampleSignaturePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK8AAAAyCAYAAAAOqL3lAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAEySURBVHhe7dsxCsIwFADQ6tGLuOvoFXT0Jg7iBbyK4ODVwd1B6K7g0r12EBw8i4PgIjh5q/9ASkigpfiB94Wv9h8aWpoAAAAASUVORK5CYII=';
  const sampleSealPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAB6cintraAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGkSURBVHhe7dsxCsIwFADQ6tGLuOvoFXT0Jg7iBbyK4ODVwd1B6K7g0r12EBw8i4PgIjh5q/9ASkigpfiB94Wv9h8aWpoAAAAASUVORK5CYII=';

  const updateRes = await fetch('http://127.0.0.1:8080/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      business_name: 'RMSTORVIX Prime Enterprises',
      owner_name: 'Raushan Maurya',
      signatory_name: 'Raushan Maurya',
      signatory_designation: 'Managing Director & Authorized Signatory',
      enable_digital_signature: true,
      signature_date_enabled: true,
      digital_signature_data: sampleSignaturePng,
      company_seal_data: sampleSealPng
    })
  });
  assert.strictEqual(updateRes.status, 200);
  const updateData = await updateRes.json();
  assert.strictEqual(updateData.success, true);
  console.log('  ✓ Signature & Stamp Saved to Database');

  // 4. Test Invoice Print Rendering with Digital Signature
  const invRes = await fetch('http://127.0.0.1:8080/invoice-print/1', { headers: { 'Cookie': cookie } });
  assert.strictEqual(invRes.status, 200);
  const invHtml = await invRes.text();
  assert.ok(invHtml.includes('class="inv-sig-img"'), 'Must render signature image');
  assert.ok(invHtml.includes('class="inv-seal-img"'), 'Must render seal image');
  assert.ok(invHtml.includes('Raushan Maurya'), 'Must render signatory name');
  assert.ok(invHtml.includes('Managing Director'), 'Must render signatory designation');
  assert.ok(invHtml.includes('Digitally Signed'), 'Must render verified badge');
  console.log('  ✓ Printable Invoice Renders Verified Signature, Seal & Badge');

  console.log('--- Digital Signature Verification 100% PASSED ---');
}

main().catch(err => {
  console.error('Signature test failed:', err);
  process.exit(1);
});
