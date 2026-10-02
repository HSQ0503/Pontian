import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const intakeExports = {};
vm.runInNewContext(compile("../src/lib/intake.ts"), { exports: intakeExports });
const handlerCode = compile("../src/app/api/intake/route.ts");
const siteverify = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const webhook = "https://delivery.example.test/intake";
const production = {
  NODE_ENV: "production",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "production-site-key",
  TURNSTILE_SECRET_KEY: "production-secret-key",
  PONTIAN_INTAKE_WEBHOOK_URL: webhook,
};
const validResult = { success: true, action: "intake", hostname: "www.pontian.co" };

function handler({ env = production, result = validResult, verificationStatus = 200, failFetch = false } = {}) {
  const requests = [];
  const exports = {};
  vm.runInNewContext(handlerCode, {
    exports,
    require(name) {
      assert.equal(name, "@/lib/intake");
      return intakeExports;
    },
    process: { env }, Request, Response, URL, AbortSignal,
    fetch: async (url, options) => {
      requests.push({ url: String(url), body: JSON.parse(options.body) });
      if (String(url) === siteverify) {
        if (failFetch) throw new Error("Verification service unavailable");
        return Response.json(result, { status: verificationStatus });
      }
      assert.equal(String(url), webhook);
      return Response.json({ accepted: true });
    },
  });
  return { post: exports.POST, requests };
}
function request(overrides = {}) {
  return new Request("https://www.pontian.co/api/intake", {
    method: "POST",
    headers: { origin: "https://www.pontian.co", "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "quiz",
      answers: intakeExports.intakeQuestions.map(question => question.options[0]),
      otherAnswers: [],
      contact: { name: " Example Visitor ", company: " Example Company ", email: "visitor@example.test" },
      verificationToken: "example-response-token",
      ...overrides,
    }),
  });
}

for (const token of [undefined, "", " ", "x".repeat(2049)]) {
  test(`rejects missing or malformed token (${token?.length ?? "missing"}) before calling any service`, async () => {
    const { post, requests } = handler();
    assert.equal((await post(request({ verificationToken: token }))).status, 400);
    assert.equal(requests.length, 0);
  });
}
for (const [label, env] of [
  ["unconfigured production", { NODE_ENV: "production" }],
  ["unconfigured development", { NODE_ENV: "development" }],
  ["missing public key", { ...production, NEXT_PUBLIC_TURNSTILE_SITE_KEY: "" }],
  ["test secret in production", { ...production, TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA" }],
  ["test site key in production", { ...production, NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA" }],
]) {
  test(`${label} fails closed`, async () => {
    const { post, requests } = handler({ env });
    assert.equal((await post(request())).status, 503);
    assert.equal(requests.length, 0);
  });
}
for (const [label, result] of [
  ["forged token", { success: false, "error-codes": ["invalid-input-response"] }],
  ["expired or reused token", { success: false, "error-codes": ["timeout-or-duplicate"] }],
  ["incorrect action", { ...validResult, action: "other-form" }],
  ["incorrect hostname", { ...validResult, hostname: "another.example.test" }],
  ["truthy non-boolean success", { ...validResult, success: "true" }],
]) {
  test(`${label} cannot reach delivery`, async () => {
    const { post, requests } = handler({ result });
    assert.equal((await post(request())).status, 400);
    assert.deepEqual(requests.map(item => item.url), [siteverify]);
  });
}
test("provider outage blocks delivery", async () => {
  const { post, requests } = handler({ failFetch: true });
  assert.equal((await post(request())).status, 503);
  assert.deepEqual(requests.map(item => item.url), [siteverify]);
});
for (const mode of ["quiz", "skorman-contact"]) {
  test(`verified ${mode} reaches the existing destination with its payload intact`, async () => {
    const { post, requests } = handler();
    const response = await post(request({ mode }));
    assert.equal(response.status, 200);
    assert.deepEqual(requests.map(item => item.url), [siteverify, webhook]);
    assert.equal(requests[0].body.response, "example-response-token");
    assert.equal(requests[1].body.contact.name, "Example Visitor");
    assert.equal(requests[1].body.responses.length, mode === "quiz" ? 10 : 0);
    assert.equal(requests[1].body.source, mode === "quiz" ? "pontian-intake" : "skorman-presentation");
  });
}
test("verification does not claim delivery when no destination is configured", async () => {
  const { post, requests } = handler({ env: { ...production, PONTIAN_INTAKE_WEBHOOK_URL: "" } });
  const response = await post(request());
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not.*sent/i);
  assert.deepEqual(requests.map(item => item.url), [siteverify]);
});
