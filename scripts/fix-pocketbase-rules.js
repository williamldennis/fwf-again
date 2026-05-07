/**
 * Script to fix PocketBase collection rules for friend visibility
 *
 * Run with: node scripts/fix-pocketbase-rules.js
 *
 * You'll be prompted for your PocketBase admin credentials
 */

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function main() {
    console.log('\n🔧 PocketBase Rules Fixer\n');
    console.log('This script will update collection rules to allow friends to see each other\'s profiles and gardens.\n');

    // Get credentials
    const pbUrl = await question('PocketBase URL (e.g., https://your-pb.pockethost.io): ');
    const adminEmail = await question('Admin email: ');
    const adminPassword = await question('Admin password: ');

    console.log('\n📡 Connecting to PocketBase...');

    try {
        // Authenticate as admin
        const authResponse = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identity: adminEmail,
                password: adminPassword
            })
        });

        if (!authResponse.ok) {
            const error = await authResponse.text();
            throw new Error(`Authentication failed: ${error}`);
        }

        const authData = await authResponse.json();
        const token = authData.token;
        console.log('✅ Authenticated successfully\n');

        // Get all collections
        const collectionsResponse = await fetch(`${pbUrl}/api/collections`, {
            headers: { 'Authorization': token }
        });
        const collections = await collectionsResponse.json();

        // Define the rules to apply
        const ruleUpdates = {
            'users': {
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                updateRule: 'id = @request.auth.id',
                deleteRule: 'id = @request.auth.id'
            },
            'planted_plants': {
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: 'garden_owner = @request.auth.id || planter = @request.auth.id',
                deleteRule: 'garden_owner = @request.auth.id'
            },
            'garden_activities': {
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: 'garden_owner = @request.auth.id || actor = @request.auth.id',
                deleteRule: 'garden_owner = @request.auth.id'
            },
            'plants': {
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: null,  // Admin only
                updateRule: null,  // Admin only
                deleteRule: null   // Admin only
            },
            'user_contacts': {
                listRule: 'user = @request.auth.id',
                viewRule: 'user = @request.auth.id',
                createRule: '@request.auth.id != ""',
                updateRule: 'user = @request.auth.id',
                deleteRule: 'user = @request.auth.id'
            },
            'xp_transactions': {
                listRule: 'user = @request.auth.id',
                viewRule: 'user = @request.auth.id',
                createRule: '@request.auth.id != ""',
                updateRule: null,
                deleteRule: null
            },
            'user_achievements': {
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: 'user = @request.auth.id',
                deleteRule: null
            },
            'weather_data': {
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: null
            },
            'city_coordinates': {
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: null
            }
        };

        // Update each collection
        for (const [collectionName, rules] of Object.entries(ruleUpdates)) {
            const collection = collections.find(c => c.name === collectionName);
            if (!collection) {
                console.log(`⚠️  Collection '${collectionName}' not found, skipping`);
                continue;
            }

            console.log(`📝 Updating '${collectionName}' rules...`);

            const updateResponse = await fetch(`${pbUrl}/api/collections/${collection.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(rules)
            });

            if (updateResponse.ok) {
                console.log(`   ✅ ${collectionName} updated`);
            } else {
                const error = await updateResponse.text();
                console.log(`   ❌ Failed to update ${collectionName}: ${error}`);
            }
        }

        console.log('\n🎉 Done! Collection rules have been updated.');
        console.log('Your friends should now be able to see each other\'s profiles and gardens.\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }

    rl.close();
}

main();
