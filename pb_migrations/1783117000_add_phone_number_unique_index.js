/// <reference path="../pb_data/types.d.ts" />

// Adds a partial unique index on users.phone_number (the app's social matching
// key) so two accounts can't claim the same number. The WHERE clause keeps the
// many in-progress signups with an empty phone_number from colliding.
// Guarded so it can't break startup on an instance without a phone_number field.
migrate(
    (app) => {
        const users = app.findCollectionByNameOrId("users");
        const phoneIndex =
            "CREATE UNIQUE INDEX `idx_users_phone_number` ON `users` (`phone_number`) WHERE `phone_number` != ''";
        if (
            users.fields.getByName("phone_number") &&
            !users.indexes.find((i) => i.includes("idx_users_phone_number"))
        ) {
            users.indexes.push(phoneIndex);
            app.save(users);
        }
    },
    (app) => {
        const users = app.findCollectionByNameOrId("users");
        users.indexes = users.indexes.filter(
            (i) => !i.includes("idx_users_phone_number")
        );
        app.save(users);
    }
);
