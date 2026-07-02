/**
 * Throwaway OIDC IdP for local smoke-testing the login flow
 * (scripts/smoke-auth.sh). Not used in production.
 *
 *   node scripts/mock-idp.mjs [port] [email] [name]
 */
import { OAuth2Server } from "oauth2-mock-server";

const port = Number(process.argv[2] ?? 8043);
const email = process.argv[3] ?? "admin@test.local";
const name = process.argv[4] ?? "Test Admin";

const server = new OAuth2Server();
await server.issuer.keys.generate("RS256");

// Attach the profile claims Nexora needs to every id_token.
server.service.on("beforeTokenSigning", (token) => {
  token.payload.email = email;
  token.payload.name = name;
});

await server.start(port, "127.0.0.1");
console.log(`mock IdP on ${server.issuer.url} (email=${email})`);
