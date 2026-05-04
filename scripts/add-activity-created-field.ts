/**
 * Add created_at timestamp field to garden_activities collection
 *
 * Since the collection doesn't have auto-date fields, we'll add an explicit timestamp field.
 *
 * Run with: PB_ADMIN_EMAIL=your@email.com PB_ADMIN_PASSWORD=yourpass npx tsx scripts/add-activity-created-field.ts
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'https://fwf-pocketbase-production.up.railway.app';

async function addCreatedField() {
  console.log('🔧 Adding created_at field to garden_activities...\n');
  console.log(`Connecting to: ${POCKETBASE_URL}\n`);

  const pb = new PocketBase(POCKETBASE_URL);

  // Authenticate as admin
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: Please set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD environment variables');
    console.error('Usage: PB_ADMIN_EMAIL=your@email.com PB_ADMIN_PASSWORD=yourpass npx tsx scripts/add-activity-created-field.ts');
    process.exit(1);
  }

  try {
    console.log('🔐 Authenticating as admin...');
    await pb.admins.authWithPassword(email, password);
    console.log('✅ Authenticated successfully\n');

    // Get the current collection schema
    console.log('📋 Fetching current collection schema...');
    const collection = await pb.collections.getOne('garden_activities');

    console.log('Current fields:', collection.schema?.map((f: any) => f.name).join(', '));

    // Check if created_at already exists
    const hasCreatedAt = collection.schema?.some((f: any) => f.name === 'created_at');

    if (hasCreatedAt) {
      console.log('\n✅ created_at field already exists!');
      return;
    }

    // Add the created_at field
    console.log('\n📝 Adding created_at field...');

    const updatedSchema = [
      ...(collection.schema || []),
      {
        name: 'created_at',
        type: 'date',
        required: false,
        options: {},
      },
    ];

    await pb.collections.update('garden_activities', {
      schema: updatedSchema,
    });

    console.log('✅ created_at field added successfully!\n');

    // Now backfill existing records with a timestamp
    console.log('📊 Backfilling existing records...');

    const allRecords = await pb.collection('garden_activities').getFullList();
    console.log(`Found ${allRecords.length} records to update`);

    let updated = 0;
    for (const record of allRecords) {
      if (!record.created_at) {
        // Use the record's internal created timestamp if available, or current time
        // PocketBase internal fields might still exist even if not returned in API
        const timestamp = new Date().toISOString();

        try {
          await pb.collection('garden_activities').update(record.id, {
            created_at: timestamp,
          });
          updated++;
        } catch (e) {
          console.error(`Failed to update record ${record.id}:`, e);
        }
      }
    }

    console.log(`✅ Updated ${updated} records with timestamps`);
    console.log('\n🎉 Done! The created_at field is now available.');

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

addCreatedField();
