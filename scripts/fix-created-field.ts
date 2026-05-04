import PocketBase from 'pocketbase';

const pb = new PocketBase('https://fwf-pocketbase-production.up.railway.app');

async function fix() {
  await pb.admins.authWithPassword(
    process.env.PB_ADMIN_EMAIL as string,
    process.env.PB_ADMIN_PASSWORD as string
  );

  // Get collection
  const collection = await pb.collections.getOne('garden_activities');

  // Find and remove the autodate created field, replace with regular date
  const fieldsWithoutCreated = collection.fields.filter((f: any) => f.name !== 'created');

  // Add a regular date field instead
  fieldsWithoutCreated.push({
    name: 'created',
    type: 'date',
    hidden: false,
    presentable: false,
    system: false,
    required: false,
  });

  console.log('Changing created field from autodate to date...');
  await pb.collections.update('garden_activities', { fields: fieldsWithoutCreated });

  console.log('Done! Now setting values...');

  // Set values
  const records = await pb.collection('garden_activities').getFullList();
  for (const record of records) {
    const timestamp = record.updated || new Date().toISOString();
    await pb.collection('garden_activities').update(record.id, {
      created: timestamp,
    });
  }

  console.log('Updated', records.length, 'records');

  // Verify
  const sample = await pb.collection('garden_activities').getList(1, 3);
  for (const r of sample.items) {
    console.log('- created:', r.created);
  }
}

fix();
