import PocketBase from 'pocketbase';

const pb = new PocketBase('https://fwf-pocketbase-production.up.railway.app');

async function fixPlantNames() {
  await pb.admins.authWithPassword(
    process.env.PB_ADMIN_EMAIL as string,
    process.env.PB_ADMIN_PASSWORD as string
  );

  // Get all activities
  const records = await pb.collection('garden_activities').getFullList();

  // Get plant types to map IDs to names
  const plants = await pb.collection('plants').getFullList();
  const plantMap = new Map<string, string>();
  for (const p of plants) {
    plantMap.set(p.id, p.name);
  }

  console.log('Plant map:', Object.fromEntries(plantMap));
  console.log('Found', records.length, 'activities');

  let fixed = 0;
  for (const record of records) {
    const needsFix = record.plant_name === 'Unknown Plant' ||
                     record.plant_name === 'Unknown' ||
                     record.plant_name === '' ||
                     record.plant_name === null ||
                     record.plant_name === undefined;

    if (needsFix) {
      const plantName = plantMap.get(record.plant);
      if (plantName) {
        await pb.collection('garden_activities').update(record.id, {
          plant_name: plantName,
        });
        console.log('Fixed:', record.id, '->', plantName);
        fixed++;
      }
    }
  }

  console.log('Fixed', fixed, 'records');
}

fixPlantNames();
