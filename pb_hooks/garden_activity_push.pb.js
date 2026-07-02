/// <reference path="../pb_data/types.d.ts" />

// Send a push notification to a garden owner whenever a friend plants in or
// harvests from their garden. Runs after the garden_activities record is
// created; failures are logged and never block the create.
onRecordAfterCreateSuccess((e) => {
    try {
        const record = e.record;
        const gardenOwnerId = record.getString("garden_owner");
        const actorId = record.getString("actor");

        // Don't notify yourself for your own actions.
        if (gardenOwnerId && gardenOwnerId !== actorId) {
            let owner = null;
            try {
                owner = e.app.findRecordById("users", gardenOwnerId);
            } catch (_) {
                owner = null;
            }

            const token = owner ? owner.getString("push_token") : "";
            if (token) {
                const activityType = record.getString("activity_type");
                const actorName = record.getString("actor_name") || "A friend";
                const plantName = record.getString("plant_name") || "a plant";

                let title = "";
                let body = "";
                if (activityType === "planted") {
                    title = "🌱 New plant in your garden!";
                    body = actorName + " planted " + plantName + " in your garden.";
                } else if (activityType === "harvested") {
                    title = "🧺 Your garden was harvested";
                    body = actorName + " harvested " + plantName + " from your garden.";
                }

                if (title) {
                    // Overridable for local testing; defaults to Expo's push API.
                    const pushUrl =
                        $os.getenv("EXPO_PUSH_API_URL") ||
                        "https://exp.host/--/api/v2/push/send";

                    const res = $http.send({
                        url: pushUrl,
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify({
                            to: token,
                            title: title,
                            body: body,
                            sound: "default",
                            priority: "high",
                            data: {
                                type: "garden_activity",
                                activity_id: record.id,
                                activity_type: activityType,
                                garden_owner: gardenOwnerId,
                            },
                        }),
                        timeout: 5,
                    });

                    $app
                        .logger()
                        .info(
                            "[garden_activity_push] sent",
                            "status",
                            res.statusCode,
                            "owner",
                            gardenOwnerId,
                            "type",
                            activityType
                        );
                }
            }
        }
    } catch (err) {
        $app
            .logger()
            .error("[garden_activity_push] failed", "error", String(err));
    }

    e.next();
}, "garden_activities");
