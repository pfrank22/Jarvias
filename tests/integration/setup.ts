/**
 * Integration tests run against TEST_DATABASE_URL, a disposable database that
 * is truncated before each test file. Refuse anything that is not clearly a
 * local/CI test database so tests can never wipe real data.
 */
import "dotenv/config";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL must be set for integration tests.");
const parsed = new URL(url);
if (
  !/test/i.test(parsed.pathname) ||
  !["localhost", "127.0.0.1", "postgres"].includes(parsed.hostname)
) {
  throw new Error(`Refusing to run integration tests against ${parsed.hostname}${parsed.pathname}`);
}
process.env.DATABASE_URL = url;
