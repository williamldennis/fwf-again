/**
 * Script to fix plant growth times in PocketBase production
 *
 * Run with: PB_ADMIN_EMAIL=your@email.com PB_ADMIN_PASSWORD=yourpass npx ts-node scripts/fix-plant-growth-times.ts
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'https://fwf-pocketbase-production.up.railway.app';

// Correct growth times from the original spec
const CORRECT_GROWTH_TIMES: Record<string, number> = {
  'Sunflower': 4,
  'Mushroom': 2,
  'Fern': 6,
  'Cactus': 3,
  'Water Lily': 5,
  'Pine Tree': 8,
};

async function main() {
  console.log('Plant Growth Time Fix Script');
  console.log('================================\n');
  console.log(`Connecting to: ${POCKETBASE_URL}\n`);

  const pb = new PocketBase(POCKETBASE_URL);

  // Get admin credentials from environment
  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: Please set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD environment variables');
    console.error('Usage: PB_ADMIN_EMAIL=your@email.com PB_ADMIN_PASSWORD=yourpass npx ts-node scripts/fix-plant-growth-times.ts');
    process.exit(1);
  }

  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(email, password);
    console.log('Authenticated successfully\n');

    // Fetch all plants
    const plants = await pb.collection('plants').getFullList();
    console.log(`Found ${plants.length} plants:\n`);

    // Show current values and update
    for (const plant of plants) {
      const correctTime = CORRECT_GROWTH_TIMES[plant.name];

      if (correctTime === undefined) {
        console.log(`[SKIP] ${plant.name}: Unknown plant, skipping`);
        continue;
      }

      const currentTime = plant.growth_time_hours;

      if (currentTime === correctTime) {
        console.log(`[OK] ${plant.name}: ${currentTime}h (already correct)`);
      } else {
        console.log(`[FIX] ${plant.name}: ${currentTime}h -> ${correctTime}h`);

        await pb.collection('plants').update(plant.id, {
          growth_time_hours: correctTime,
        });

        console.log(`      Updated!`);
      }
    }

    console.log('\nDone! All plant growth times have been corrected.');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  }
}

main();
