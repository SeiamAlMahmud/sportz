import { eq } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import { users } from "../db/schema.js";

async function runCrudDemo() {
  console.log("Starting CRUD demo...");

  const [createdUser] = await db
    .insert(users)
    .values({
      name: "Mahmud Demo",
      email: `mahmud.demo.${Date.now()}@example.com`,
      age: 25,
    })
    .returning();

  console.log("Create:", createdUser);

  const foundUsers = await db.select().from(users).where(eq(users.id, createdUser.id));
  console.log("Read:", foundUsers[0]);

  const [updatedUser] = await db
    .update(users)
    .set({ name: "Mahmud Updated", age: 26 })
    .where(eq(users.id, createdUser.id))
    .returning();

  console.log("Update:", updatedUser);

  const [deletedUser] = await db.delete(users).where(eq(users.id, createdUser.id)).returning();
  console.log("Delete:", deletedUser);

  console.log("CRUD demo complete.");
}

runCrudDemo().catch((error) => {
  console.error("CRUD demo failed:", error);
  process.exitCode = 1;
}).finally(async () => {
  await pool.end();
});
