/// <reference path="../pb_data/types.d.ts" />

// Applies the users-collection schema changes needed in production:
//   - push_token: stores the device's Expo push token (garden-activity pushes)
//   - a partial unique index on phone_number (the social matching key)
//
// Guarded so it's safe even if the field/index were already added manually via
// the Admin UI. Auto-applied on startup by PocketBase's automigrate.
migrate(
    (app) => {
        const users = app.findCollectionByNameOrId("users");

        if (!users.fields.getByName("push_token")) {
            users.fields.add(
                new Field({
                    name: "push_token",
                    type: "text",
                })
            );
        }

        // Partial index so the many in-progress signups with an empty
        // phone_number don't collide, while real numbers stay unique.
        // Guarded on the field existing so this can never break startup on an
        // instance that predates the phone_number field.
        const phoneIndex =
            "CREATE UNIQUE INDEX `idx_users_phone_number` ON `users` (`phone_number`) WHERE `phone_number` != ''";
        if (
            users.fields.getByName("phone_number") &&
            !users.indexes.find((i) => i.includes("idx_users_phone_number"))
        ) {
            users.indexes.push(phoneIndex);
        }

        app.save(users);
    },
    (app) => {
        const users = app.findCollectionByNameOrId("users");
        users.fields.removeByName("push_token");
        users.indexes = users.indexes.filter(
            (i) => !i.includes("idx_users_phone_number")
        );
        app.save(users);
    }
);
