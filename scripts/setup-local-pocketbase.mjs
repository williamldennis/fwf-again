// Idempotent local PocketBase schema setup for Fair Weather Friends.
//
// Reads pocketbase-deploy/pb_schema.json (legacy PB export format) and applies
// it to a locally running PocketBase instance via the admin API, translating
// the legacy `schema`/`options` format to the current `fields` format.
//
// Usage (PocketBase must already be running):
//   node scripts/setup-local-pocketbase.mjs
//
// Environment variables (all optional, defaults shown):
//   PB_URL=http://localhost:8080
//   PB_ADMIN_EMAIL=admin@fwf.local
//   PB_ADMIN_PASSWORD=adminpassword123

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PB_URL = process.env.PB_URL || "http://localhost:8080";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || "admin@fwf.local";
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || "adminpassword123";

const schemaPath = path.join(__dirname, "..", "pocketbase-deploy", "pb_schema.json");
const legacy = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

let token = "";
const nameToId = {};

async function api(method, endpoint, body) {
    const res = await fetch(`${PB_URL}${endpoint}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: token } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (!res.ok) {
        throw new Error(`${method} ${endpoint} -> ${res.status}: ${JSON.stringify(json)}`);
    }
    return json;
}

function translateField(f) {
    const base = { name: f.name, type: f.type, required: !!f.required };
    const o = f.options || {};
    switch (f.type) {
        case "text":
        case "number":
        case "bool":
        case "date":
            return base;
        case "json":
            return { ...base, maxSize: o.maxSize || 2000000 };
        case "file":
            return {
                ...base,
                maxSelect: o.maxSelect || 1,
                maxSize: o.maxSize || 5242880,
                mimeTypes: o.mimeTypes || [],
            };
        case "select":
            return { ...base, maxSelect: o.maxSelect || 1, values: o.values || [] };
        case "relation": {
            const collectionId = nameToId[o.collectionId] || o.collectionId;
            return {
                ...base,
                collectionId,
                cascadeDelete: !!o.cascadeDelete,
                maxSelect: o.maxSelect || 1,
            };
        }
        default:
            return base;
    }
}

async function ensureUsersCollection(def) {
    const list = await api("GET", "/api/collections?perPage=200");
    const existing = list.items.find((c) => c.name === "users");
    if (!existing) throw new Error("Default 'users' auth collection not found");
    nameToId["users"] = existing.id;

    const existingNames = new Set(existing.fields.map((f) => f.name));
    const newFields = def.schema
        .filter((f) => !existingNames.has(f.name))
        .map(translateField);

    const payload = {
        fields: [...existing.fields, ...newFields],
        // Allow public sign-up and let authenticated users read profiles (needed for friends).
        createRule: "",
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = id",
    };
    await api("PATCH", `/api/collections/${existing.id}`, payload);
    console.log(`users: ensured (${newFields.length} custom field(s) added)`);
}

// PocketBase 0.23+ no longer auto-creates created/updated fields; the app sorts
// by `created` (e.g. XP history, activity feed), so add them explicitly.
const AUTODATE_FIELDS = [
    { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
];

async function ensureBaseCollection(def) {
    const list = await api("GET", "/api/collections?perPage=200");
    const existing = list.items.find((c) => c.name === def.name);
    if (existing) {
        nameToId[def.name] = existing.id;
        // Backfill created/updated autodate fields if a prior run created the
        // collection without them.
        const existingNames = new Set(existing.fields.map((f) => f.name));
        const missing = AUTODATE_FIELDS.filter((f) => !existingNames.has(f.name));
        if (missing.length > 0) {
            await api("PATCH", `/api/collections/${existing.id}`, {
                fields: [...existing.fields, ...missing],
            });
            console.log(`${def.name}: added ${missing.map((f) => f.name).join(", ")}`);
        } else {
            console.log(`${def.name}: already exists, skipping`);
        }
        return;
    }
    const fields = [...def.schema.map(translateField), ...AUTODATE_FIELDS];
    const payload = {
        name: def.name,
        type: "base",
        fields,
        // Permissive rules for local development.
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        ...(def.indexes ? { indexes: def.indexes } : {}),
    };
    const created = await api("POST", "/api/collections", payload);
    nameToId[def.name] = created.id;
    console.log(`${def.name}: created`);
}

async function main() {
    const auth = await api("POST", "/api/collections/_superusers/auth-with-password", {
        identity: PB_ADMIN_EMAIL,
        password: PB_ADMIN_PASSWORD,
    });
    token = auth.token;

    // Pre-populate name->id for existing collections so relations resolve.
    const list = await api("GET", "/api/collections?perPage=200");
    for (const c of list.items) nameToId[c.name] = c.id;

    for (const def of legacy) {
        if (def.type === "auth" && def.name === "users") {
            await ensureUsersCollection(def);
        }
    }
    // Base collections in file order (users & plants precede their dependents).
    for (const def of legacy) {
        if (def.type === "base") {
            await ensureBaseCollection(def);
        }
    }
    console.log("PocketBase schema setup complete.");
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
