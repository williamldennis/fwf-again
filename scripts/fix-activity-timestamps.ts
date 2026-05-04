/**
 * Fix garden_activities collection to include created/updated timestamps
 *
 * PocketBase should auto-generate these fields, but they're not being returned.
 * This script checks the collection schema and fixes it if needed.
 *
 * Run with: PB_ADMIN_EMAIL=your@email.com PB_ADMIN_PASSWORD=yourpass npx tsx scripts/fix-activity-timestamps.ts
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'https://fwf-pocketbase-production.up.railway.app';

async function fixActivityTimestamps() {
  console.log('🔧 Fixing garden_activities timestamps...\n');
  console.log(`Connecting to: ${POCKETBASE_URL}\n`);

  const pb = new PocketBase(POCKETBASE_URL);

  // Authenticate as admin
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: Please set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD environment variables');
    console.error('Usage: PB_ADMIN_EMAIL=your@email.com PB_ADMIN_PASSWORD=yourpass npx tsx scripts/fix-activity-timestamps.ts');
    process.exit(1);
  }

  try {
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(email, password);
    console.log('✅ Authenticated successfully\n');

    // Get the collection schema
    console.log('📋 Fetching garden_activities collection schema...');
    const collection = await pb.collections.getOne('garden_activities');

    console.log('\nCurrent collection config:');
    console.log('- Name:', collection.name);
    console.log('- Type:', collection.type);
    console.log('- Fields:', collection.schema?.map((f: any) => f.name).join(', ') || 'none');

    // Check if it's a base collection (which should have auto-date fields)
    if (collection.type === 'base') {
      console.log('\n✅ Collection is a base collection - should have auto-date fields');

      // Fetch a record to see what fields are actually returned
      console.log('\n📊 Fetching sample record...');
      const records = await pb.collection('garden_activities').getList(1, 1);

      if (records.items.length > 0) {
        const record = records.items[0];
        console.log('Sample record fields:', Object.keys(record));
        console.log('- created:', record.created);
        console.log('- updated:', record.updated);

        if (record.created) {
          console.log('\n✅ Records DO have created field! The issue may be in how the app fetches data.');
        } else {
          console.log('\n❌ Records are missing created field. This is unusual for PocketBase.');
          console.log('This might be a view collection or have custom configuration.');
        }
      }
    } else {
      console.log(`\n⚠️ Collection type is "${collection.type}" - not a standard base collection`);
    }

    // Log full collection details for debugging
    console.log('\n📜 Full collection details:');
    console.log(JSON.stringify(collection, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

fixActivityTimestamps();
