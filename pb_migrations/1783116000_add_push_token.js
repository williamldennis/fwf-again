/// <reference path="../pb_data/types.d.ts" />

// Adds the users.push_token field used to deliver garden-activity push
// notifications. Auto-applied on startup by PocketBase's automigrate.
// Guarded so it's safe even if the field was already added manually.
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
            app.save(users);
        }
    },
    (app) => {
        const users = app.findCollectionByNameOrId("users");
        users.fields.removeByName("push_token");
        app.save(users);
    }
);
