import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { WebSocket } from "ws";
import { db, getNewZero, shutdown, startPostgresAndZero } from "./utils";

// Provide WebSocket on the global scope
globalThis.WebSocket = WebSocket as any;

beforeAll(async () => {
  await startPostgresAndZero();
}, 60000);

afterAll(async () => {
  await shutdown();
});

describe("relationships", () => {
  test("can query users", async () => {
    const zero = await getNewZero();

    const q = zero.query.user;

    const preloadedUsers = await q.preload();
    await preloadedUsers.complete;

    const user = await q.run();

    expect(user).toHaveLength(3);
    expect(user[0]?.name).toBe("James");
    expect(user[0]?.id).toBe("1");
    expect(user[0]?.email).toBe("james@example.com");
    expect(
      user[0]?.customTypeJson.custom === "this-is-imported-from-custom-types",
    ).toBe(true);
    expect(
      user[0]?.customInterfaceJson.custom ===
        "this-interface-is-imported-from-custom-types",
    ).toBe(true);
    expect(user[0]?.testExportedType.nameType === "custom-inline-type").toBe(
      true,
    );
    expect(
      user[0]?.testInterface.nameInterface === "custom-inline-interface",
    ).toBe(true);
    expect(user[0]?.testType.nameType === "custom-inline-type").toBe(true);

    preloadedUsers.cleanup();
  });

  test("can query filters", async () => {
    const zero = await getNewZero();

    const q = zero.query.filters
      .where((q) => q.cmp("id", "=", "1"))
      .related("children", (q) => q.related("children").orderBy("id", "asc"));

    const preloadedFilters = await q.preload();
    await preloadedFilters.complete;

    const filters = await q.run();

    expect(filters).toHaveLength(1);
    expect(filters[0]?.name).toBe("filter1");
    expect(filters[0]?.children).toHaveLength(2);
    expect(filters[0]?.children[0]?.name).toBe("filter2");
    expect(filters[0]?.children[1]?.name).toBe("filter3");
    expect(filters[0]?.children[0]?.children[0]?.name).toBeUndefined();

    preloadedFilters.cleanup();
  });

  test("can query messages", async () => {
    const zero = await getNewZero();

    const q = zero.query.message;

    const preloadedMessages = await q.preload();
    await preloadedMessages.complete;

    const messages = await q.run();

    expect(messages).toHaveLength(2);
    expect(messages[0]?.body).toBe("Hey, James!");
    expect(messages[0]?.metadata.key).toStrictEqual("value1");

    preloadedMessages.cleanup();
  });

  test("can query messages with filter", async () => {
    const zero = await getNewZero();

    const q = zero.query.message.where((query) =>
      query.cmp("body", "=", "Thomas!"),
    );

    const preloadedMessages = await q.preload();
    await preloadedMessages.complete;

    const messages = await q.run();

    expect(messages).toHaveLength(1);
    expect(messages[0]?.body).toBe("Thomas!");
    expect(messages[0]?.metadata.key).toStrictEqual("value5");

    preloadedMessages.cleanup();
  });

  test("can query messages with relationships", async () => {
    const zero = await getNewZero();

    const q = zero.query.message.related("medium").related("sender");

    const preloadedMessages = await q.preload();
    await preloadedMessages.complete;

    const messages = await q.one().run();

    expect(messages?.medium?.id).toBe("1");
    expect(messages?.medium?.name).toBe("email");

    expect(messages?.sender?.name).toBe("James");

    preloadedMessages.cleanup();
  });

  test("can insert messages", async () => {
    const zero = await getNewZero();

    await zero.mutate.message.insert({
      id: "99",
      body: "Hi, James!",
      senderId: "1",
      mediumId: "4",
      metadata: { key: "9988" },
    });

    const q = zero.query.message.where((query) => query.cmp("id", "=", "99"));

    const preloadedMessages = await q.preload();
    await preloadedMessages.complete;

    const message = await q.one().run();

    expect(message?.id).toBe("99");
    expect(message?.metadata.key).toStrictEqual("9988");
    expect(message?.createdAt).toBeDefined();
    expect(message?.updatedAt).toBeDefined();
    preloadedMessages.cleanup();

    const q1 = zero.query.medium.where((query) =>
      query.cmp("id", "=", message?.mediumId ?? "none"),
    );

    const preloadedMedium = await q1.preload();
    await preloadedMedium.complete;

    const medium = await q1.one().run();

    expect(medium?.name).toBe("whatsapp");

    preloadedMedium.cleanup();
  });
});

describe("types", () => {
  test("can query all types", async () => {
    const zero = await getNewZero();

    const q = zero.query.allTypes.one();

    const preloadedAllTypes = await q.preload();
    await preloadedAllTypes.complete;

    const result = await q.run();

    expect(result?.id).toStrictEqual("1");
    expect(result?.smallintField).toStrictEqual(1);
    expect(result?.integerField).toStrictEqual(2);
    expect(result?.bigintField).toStrictEqual(95807);
    expect(result?.bigintNumberField).toStrictEqual(444);
    expect(result?.numericField).toStrictEqual(8.8);
    expect(result?.decimalField).toStrictEqual(9.9);
    expect(result?.realField).toStrictEqual(10.8);
    expect(result?.doublePrecisionField).toStrictEqual(11.9);
    expect(result?.textField).toStrictEqual("text");
    expect(result?.charField).toStrictEqual("c");
    expect(typeof result?.uuidField).toStrictEqual("string");
    expect(result?.varcharField).toStrictEqual("varchar");
    expect(result?.booleanField).toStrictEqual(true);
    expect(typeof result?.timestampField).toStrictEqual("number");
    expect(typeof result?.timestampTzField).toStrictEqual("number");
    expect(typeof result?.timestampModeDate).toStrictEqual("number");
    expect(typeof result?.timestampModeString).toStrictEqual("number");
    expect(typeof result?.dateField).toStrictEqual("number");
    expect(result?.jsonField).toStrictEqual({ key: "value" });
    expect(result?.jsonbField).toStrictEqual({ key: "value" });
    expect(result?.typedJsonField).toStrictEqual({
      theme: "light",
      fontSize: 16,
    });
    expect(result?.statusField).toStrictEqual("pending");

    expect(result?.smallSerialField).toStrictEqual(1);
    expect(result?.serialField).toStrictEqual(1);
    expect(result?.bigSerialField).toStrictEqual(1);

    expect(result?.optionalSmallint).toBeNull();
    expect(result?.optionalInteger).toBeNull();
    expect(result?.optionalBigint).toBeNull();
    expect(result?.optionalNumeric).toBeNull();
    expect(result?.optionalReal).toBeNull();
    expect(result?.optionalDoublePrecision).toBeNull();
    expect(result?.optionalText).toBeNull();
    expect(result?.optionalBoolean).toBeNull();
    expect(result?.optionalTimestamp).toBeNull();
    expect(result?.optionalJson).toBeNull();
    expect(result?.optionalEnum).toBeNull();
    expect(result?.optionalVarchar).toBeNull();
    expect(result?.optionalUuid).toBeNull();
    expect(result?.optionalEnum).toBeNull();
    expect(result?.optionalVarchar).toBeNull();
    expect(result?.optionalUuid).toBeNull();

    preloadedAllTypes.cleanup();
  });

  test("can insert all types", async () => {
    const zero = await getNewZero();

    const currentDate = new Date();

    await zero.mutate.allTypes.insert({
      id: "1011",
      smallintField: 22,
      integerField: 23,
      bigintField: 24,
      bigintNumberField: 444,
      numericField: 25.84,
      decimalField: 26.33,
      realField: 27.1,
      doublePrecisionField: 28.2,
      textField: "text2",
      charField: "f",
      uuidField: randomUUID(),
      varcharField: "varchar2",
      booleanField: true,
      timestampField: currentDate.getTime(),
      timestampTzField: currentDate.getTime(),
      timestampModeDate: currentDate.getTime(),
      timestampModeString: currentDate.getTime(),
      dateField: currentDate.getTime(),
      jsonField: { key: "value" },
      jsonbField: { key: "value" },
      typedJsonField: { theme: "light", fontSize: 16 },
      statusField: "active",
    });

    const q = zero.query.allTypes.where((query) =>
      query.cmp("id", "=", "1011"),
    );

    const preloadedAllTypes = await q.preload();
    await preloadedAllTypes.complete;

    const result = await q.one().run();

    expect(result?.id).toStrictEqual("1011");
    expect(result?.smallintField).toStrictEqual(22);
    expect(result?.integerField).toStrictEqual(23);
    expect(result?.bigintField).toStrictEqual(24);
    expect(result?.bigintNumberField).toStrictEqual(444);
    expect(result?.numericField).toStrictEqual(25.84);
    expect(result?.decimalField).toStrictEqual(26.33);
    expect(result?.realField).toStrictEqual(27.1);
    expect(result?.doublePrecisionField).toStrictEqual(28.2);
    expect(result?.textField).toStrictEqual("text2");
    expect(result?.charField).toStrictEqual("f");
    expect(typeof result?.uuidField).toStrictEqual("string");
    expect(result?.varcharField).toStrictEqual("varchar2");
    expect(result?.booleanField).toStrictEqual(true);
    expect(result?.timestampField).toStrictEqual(currentDate.getTime());
    expect(result?.timestampTzField).toStrictEqual(currentDate.getTime());
    expect(result?.timestampModeDate).toStrictEqual(currentDate.getTime());
    expect(result?.timestampModeString).toStrictEqual(currentDate.getTime());
    expect(result?.dateField).toBeDefined();
    expect(result?.jsonField).toStrictEqual({ key: "value" });
    expect(result?.jsonbField).toStrictEqual({ key: "value" });
    expect(result?.typedJsonField).toStrictEqual({
      theme: "light",
      fontSize: 16,
    });
    expect(result?.statusField).toStrictEqual("active");

    preloadedAllTypes.cleanup();

    const dbResult = await db.query.allTypes.findFirst({
      where: (table, { eq }) => eq(table.id, "1011"),
    });

    expect(dbResult?.id).toStrictEqual("1011");
    expect(dbResult?.smallintField).toStrictEqual(22);
    expect(dbResult?.integerField).toStrictEqual(23);
    expect(dbResult?.bigintField).toStrictEqual(24n);
    expect(dbResult?.bigintNumberField).toStrictEqual(444);
    expect(dbResult?.numericField).toStrictEqual("25.84");
    expect(dbResult?.decimalField).toStrictEqual("26.33");
    expect(dbResult?.realField).toStrictEqual(27.1);
    expect(dbResult?.doublePrecisionField).toStrictEqual(28.2);
    expect(dbResult?.textField).toStrictEqual("text2");
    expect(dbResult?.charField).toStrictEqual("f");
    expect(dbResult?.uuidField).toBeDefined();
    expect(dbResult?.varcharField).toStrictEqual("varchar2");
    expect(dbResult?.booleanField).toStrictEqual(true);
    expect(dbResult?.timestampField?.toISOString()).toStrictEqual(
      currentDate.toISOString(),
    );
    expect(dbResult?.timestampTzField?.toISOString()).toStrictEqual(
      currentDate.toISOString(),
    );
    expect(dbResult?.timestampModeDate?.toISOString()).toStrictEqual(
      currentDate.toISOString(),
    );
    expect(dbResult?.timestampModeString).toContain(
      currentDate.toISOString().split("T")[0],
    );
    expect(dbResult?.dateField).toStrictEqual(
      currentDate.toISOString().split("T")[0],
    );
    expect(dbResult?.jsonField).toStrictEqual({ key: "value" });
    expect(dbResult?.jsonbField).toStrictEqual({ key: "value" });
    expect(dbResult?.typedJsonField).toStrictEqual({
      theme: "light",
      fontSize: 16,
    });
    expect(dbResult?.statusField).toStrictEqual("active");

    expect(dbResult?.smallSerialField).toStrictEqual(2);
    expect(dbResult?.serialField).toStrictEqual(2);
    expect(dbResult?.bigSerialField).toStrictEqual(2);

    expect(dbResult?.optionalSmallint).toBeNull();
    expect(dbResult?.optionalInteger).toBeNull();
    expect(dbResult?.optionalBigint).toBeNull();
    expect(dbResult?.optionalNumeric).toBeNull();
    expect(dbResult?.optionalReal).toBeNull();
    expect(dbResult?.optionalDoublePrecision).toBeNull();
    expect(dbResult?.optionalText).toBeNull();
    expect(dbResult?.optionalBoolean).toBeNull();
    expect(dbResult?.optionalTimestamp).toBeNull();
    expect(dbResult?.optionalJson).toBeNull();
    expect(dbResult?.optionalEnum).toBeNull();
    expect(dbResult?.optionalVarchar).toBeNull();
    expect(dbResult?.optionalUuid).toBeNull();
  });
});
