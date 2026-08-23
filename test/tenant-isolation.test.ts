import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";

describe("Multi-Tenant Security Rules & Isolation Verification", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "demo-multitenant-isolation",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    // Seed database under admin context (bypasses rules)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      
      // Tenant A Baseline
      await db.doc("tenants/tenantA").set({
        id: "tenantA",
        name: "Tenant A",
      });
      await db.doc("tenants/tenantA/orders/orderA1").set({
        id: "orderA1",
        tenantId: "tenantA",
        customerName: "Alice Customer",
        totalAmount: 1200,
        status: "pending",
        assignedDriverId: "driverA_uid",
      });
      await db.doc("tenants/tenantA/drivers/driverA_uid").set({
        id: "driverA_uid",
        tenantId: "tenantA",
        name: "Driver Alpha",
      });

      // Tenant B Baseline
      await db.doc("tenants/tenantB").set({
        id: "tenantB",
        name: "Tenant B",
      });
      await db.doc("tenants/tenantB/orders/orderB1").set({
        id: "orderB1",
        tenantId: "tenantB",
        customerName: "Bob Customer",
        totalAmount: 4500,
        status: "in_transit",
        assignedDriverId: "driverB_uid",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Test Matrix: Tenant A (Alice) against Tenant A & Tenant B
  // ---------------------------------------------------------------------------
  it("allows Tenant A staff to read Tenant A orders", async () => {
    const aliceDb = testEnv
      .authenticatedContext("alice_uid", { tenantId: "tenantA", role: "staff" })
      .firestore();

    await assertSucceeds(aliceDb.doc("tenants/tenantA/orders/orderA1").get());
  });

  it("DENIES Tenant A staff from reading Tenant B orders (Cross-Tenant Read)", async () => {
    const aliceDb = testEnv
      .authenticatedContext("alice_uid", { tenantId: "tenantA", role: "staff" })
      .firestore();

    await assertFails(aliceDb.doc("tenants/tenantB/orders/orderB1").get());
  });

  it("DENIES Tenant A staff from creating an order under Tenant B", async () => {
    const aliceDb = testEnv
      .authenticatedContext("alice_uid", { tenantId: "tenantA", role: "staff" })
      .firestore();

    await assertFails(
      aliceDb.doc("tenants/tenantB/orders/orderAttack").set({
        id: "orderAttack",
        tenantId: "tenantB",
        customerName: "Spoofed Customer",
        totalAmount: 999,
      })
    );
  });

  it("DENIES Tenant A staff from mutating Tenant A order's tenantId to Tenant B (Tenant Invariant Check)", async () => {
    const aliceDb = testEnv
      .authenticatedContext("alice_uid", { tenantId: "tenantA", role: "staff" })
      .firestore();

    await assertFails(
      aliceDb.doc("tenants/tenantA/orders/orderA1").update({
        tenantId: "tenantB", // Tampering attempt
      })
    );
  });

  it("DENIES Tenant A driver from accessing driver GPS logs of Tenant B", async () => {
    const driverDb = testEnv
      .authenticatedContext("driverA_uid", { tenantId: "tenantA", role: "driver" })
      .firestore();

    await assertFails(
      driverDb.doc("tenants/tenantB/drivers/driverB_uid/locations/loc1").get()
    );
  });

  it("DENIES driver from writing GPS data for a different driver ID (IDOR Prevention)", async () => {
    const driverDb = testEnv
      .authenticatedContext("driverA_uid", { tenantId: "tenantA", role: "driver" })
      .firestore();

    await assertFails(
      driverDb.doc("tenants/tenantA/drivers/driverX_uid/locations/spoofLoc").set({
        id: "spoofLoc",
        tenantId: "tenantA",
        driverId: "driverX_uid",
        latitude: 1.29,
        longitude: 36.82,
      })
    );
  });

  it("allows Platform Admin to access cross-tenant records for platform maintenance", async () => {
    const superAdminDb = testEnv
      .authenticatedContext("super_uid", { role: "platform_admin" })
      .firestore();

    await assertSucceeds(superAdminDb.doc("tenants/tenantA/orders/orderA1").get());
    await assertSucceeds(superAdminDb.doc("tenants/tenantB/orders/orderB1").get());
  });
});
