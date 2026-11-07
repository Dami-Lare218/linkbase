import { describe, expect, it } from "vitest";

import {
  assertTestDatabaseName,
  DatabaseConfigError,
  describeConnectionError,
  isTestDatabaseName,
  parseMongoUri,
  resolveDatabaseConfig,
} from "@/lib/db/database-target";

// Made-up connection strings: example hosts and sample credentials, not real ones.
const DEV_URI = "mongodb+srv://sample-user:sample-pass@cluster0.example.mongodb.net/linkbase?retryWrites=true&w=majority";
const TEST_URI = "mongodb+srv://sample-qa:sample-pass@cluster0.example.mongodb.net/linkbase_test?retryWrites=true&w=majority";

/** Runs `fn` and returns the error it throws, so its message can be checked. */
function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error("Expected an error");
}

describe("parseMongoUri", () => {
  it("reads hosts (lowercased, without credentials) and the database name", () => {
    expect(parseMongoUri("mongodb+srv://u:p@Cluster0.Example.mongodb.net/linkbase?w=majority")).toEqual({
      hosts: "cluster0.example.mongodb.net",
      database: "linkbase",
    });
  });

  it("handles host lists, no credentials and no database", () => {
    expect(parseMongoUri("mongodb://a.example.net:27017,b.example.net:27017")).toEqual({
      hosts: "a.example.net:27017,b.example.net:27017",
      database: "",
    });
  });

  it.each(["", "https://example.com/linkbase", "not a uri", "mongodb+srv://u:p@host/%E0%A4%A"])(
    "returns null for %j",
    (value) => {
      expect(parseMongoUri(value)).toBeNull();
    },
  );
});

describe("isTestDatabaseName / assertTestDatabaseName", () => {
  it.each(["linkbase_test", "x_test"])("accepts %j", (name) => {
    expect(isTestDatabaseName(name)).toBe(true);
    expect(() => assertTestDatabaseName(name)).not.toThrow();
  });

  it.each(["linkbase", "_test", "linkbase_test2", "linkbase-test", "test", ""])("refuses %j", (name) => {
    expect(isTestDatabaseName(name)).toBe(false);
    expect(() => assertTestDatabaseName(name)).toThrow(DatabaseConfigError);
  });
});

describe("resolveDatabaseConfig: default target (dev and production)", () => {
  it("uses MONGODB_URI unchanged when LINKBASE_DB_TARGET is unset or blank", () => {
    expect(resolveDatabaseConfig({ MONGODB_URI: DEV_URI })).toEqual({ target: "default", uri: DEV_URI });
    expect(resolveDatabaseConfig({ MONGODB_URI: DEV_URI, LINKBASE_DB_TARGET: " " })).toEqual({
      target: "default",
      uri: DEV_URI,
    });
  });

  it("ignores MONGODB_URI_TEST outside test mode", () => {
    expect(resolveDatabaseConfig({ MONGODB_URI: DEV_URI, MONGODB_URI_TEST: TEST_URI }).uri).toBe(DEV_URI);
  });

  it("refuses a missing MONGODB_URI", () => {
    expect(() => resolveDatabaseConfig({})).toThrow(/MONGODB_URI is not set/);
  });

  it("refuses an unknown LINKBASE_DB_TARGET", () => {
    expect(() => resolveDatabaseConfig({ MONGODB_URI: DEV_URI, LINKBASE_DB_TARGET: "prod" })).toThrow(
      DatabaseConfigError,
    );
  });
});

describe("resolveDatabaseConfig: test target (QA only)", () => {
  const base = { LINKBASE_DB_TARGET: "test", MONGODB_URI: DEV_URI };

  it("uses MONGODB_URI_TEST when it is a separate _test database", () => {
    expect(resolveDatabaseConfig({ ...base, MONGODB_URI_TEST: TEST_URI })).toEqual({
      target: "test",
      uri: TEST_URI,
      database: "linkbase_test",
    });
  });

  it("works without MONGODB_URI set", () => {
    expect(resolveDatabaseConfig({ LINKBASE_DB_TARGET: "test", MONGODB_URI_TEST: TEST_URI }).target).toBe("test");
  });

  it("is refused in production", () => {
    expect(() => resolveDatabaseConfig({ ...base, MONGODB_URI_TEST: TEST_URI, NODE_ENV: "production" })).toThrow(
      /not allowed in production/,
    );
  });

  it("refuses a missing or invalid MONGODB_URI_TEST", () => {
    expect(() => resolveDatabaseConfig(base)).toThrow(/MONGODB_URI_TEST is not set/);
    expect(() => resolveDatabaseConfig({ ...base, MONGODB_URI_TEST: "https://example.com" })).toThrow(
      /not a valid MongoDB connection string/,
    );
  });

  it("refuses a database name that doesn't end in _test", () => {
    const uri = "mongodb+srv://sample-qa:sample-pass@cluster0.example.mongodb.net/linkbase";
    expect(() => resolveDatabaseConfig({ ...base, MONGODB_URI_TEST: uri })).toThrow(/ending in "_test"/);
  });

  it("refuses the same database as MONGODB_URI, even with other credentials or options", () => {
    const devAsTest = "mongodb+srv://sample-user:sample-pass@cluster0.example.mongodb.net/linkbase_test";
    const sameDbOtherUser = "mongodb+srv://other:other@CLUSTER0.example.mongodb.net/linkbase_test?w=majority";
    expect(() =>
      resolveDatabaseConfig({ LINKBASE_DB_TARGET: "test", MONGODB_URI: devAsTest, MONGODB_URI_TEST: devAsTest }),
    ).toThrow(/same database/);
    expect(() =>
      resolveDatabaseConfig({ LINKBASE_DB_TARGET: "test", MONGODB_URI: devAsTest, MONGODB_URI_TEST: sameDbOtherUser }),
    ).toThrow(/same database/);
  });

  it("never puts a connection string in its error messages", () => {
    const err = thrown(() =>
      resolveDatabaseConfig({ LINKBASE_DB_TARGET: "test", MONGODB_URI: TEST_URI, MONGODB_URI_TEST: TEST_URI }),
    );
    expect(String(err)).not.toContain("sample-pass");
    expect(String(err)).not.toContain("example.mongodb.net");
  });
});

describe("describeConnectionError", () => {
  it("keeps the name and message of a URI option error", () => {
    const err = new Error('URI option "w" cannot be specified with no value');
    err.name = "MongoAPIError";
    expect(describeConnectionError(err)).toBe('MongoAPIError: URI option "w" cannot be specified with no value');
  });

  it("adds the code and code name of a server error", () => {
    const err = Object.assign(new Error("bad auth : authentication failed"), { code: 8000, codeName: "AtlasError" });
    err.name = "MongoServerError";
    expect(describeConnectionError(err)).toBe("MongoServerError (8000 AtlasError): bad auth : authentication failed");
  });

  it("removes connection strings, credentials and Atlas host names", () => {
    const err = new Error(
      `failed for ${DEV_URI} via sample-user:sample-pass@proxy and getaddrinfo ENOTFOUND ac-1-shard-00-00.abc12.mongodb.net`,
    );
    const description = describeConnectionError(err);
    expect(description).not.toMatch(/sample-user|sample-pass|mongodb\.net|mongodb\+srv/);
    expect(description).toContain("<connection string>");
    expect(description).toContain("<credentials>@");
    expect(description).toContain("<atlas host>");
  });

  it("keeps the line short and on one line", () => {
    const description = describeConnectionError(new Error(`line one\nline two ${"x".repeat(1000)}`));
    expect(description).not.toContain("\n");
    expect(description.length).toBeLessThanOrEqual("Error: ".length + 300);
  });

  it("describes non-Error values without echoing them", () => {
    expect(describeConnectionError("mongodb+srv://u:p@host/db")).toBe("UnknownError");
    expect(describeConnectionError(undefined)).toBe("UnknownError");
  });
});
