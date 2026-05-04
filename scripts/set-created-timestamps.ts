import PocketBase from 'pocketbase';

const pb = new PocketBase('https://fwf-pocketbase-production.up.railway.app');

async function setCreated() {
  await pb.admins.authWithPassword(
    process.env.PB_ADMIN_EMAIL!,
    process.env.PB_ADMIN_PASSWORD!
  );

  const records = await pb.collection('garden_activities').getFullList();
  console.log('Setting created timestamp for', records.length, 'records');

  let updated = 0;
  for (const record of records) {
    if (record.created === '' || record.created === null || record.created === undefined) {
      const timestamp = record.updated || new Date().toISOString();
      await pb.collection('garden_activities').update(record.id, {
        created: timestamp,
      });
      updated++;
    }
  }

  console.log('Updated', updated, 'records');

  // Verify
  const sample = await pb.collection('garden_activities').getList(1, 3);
  console.log('\nVerifying:');
  for (const r of sample.items) {
    console.log('- id:', r.id, 'created:', r.created);
  }
}

setCreated();
