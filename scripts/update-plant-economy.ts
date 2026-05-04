/**
 * Script to update plant economy in PocketBase production
 *
 * Run with: PB_ADMIN_EMAIL=x PB_ADMIN_PASSWORD=y npx tsx scripts/update-plant-economy.ts
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'https://fwf-pocketbase-production.up.railway.app';

const NEW_ECONOMY: Record<string, { planting_cost: number; harvest_points: number }> = {
  'Sunflower':  { planting_cost: 0,  harvest_points: 6 },
  'Mushroom':   { planting_cost: 4,  harvest_points: 10 },
  'Cactus':     { planting_cost: 6,  harvest_points: 14 },
  'Water Lily': { planting_cost: 8,  harvest_points: 18 },
  'Fern':       { planting_cost: 12, harvest_points: 24 },
  'Pine Tree':  { planting_cost: 18, harvest_points: 38 },
};

async function main() {
  const pb = new PocketBase(POCKETBASE_URL);

  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD');
    process.exit(1);
  }

  await pb.admins.authWithPassword(email, password);
  console.log('Updating plant economy...\n');

  const plants = await pb.collection('plants').getFullList();

  for (const plant of plants) {
    const newValues = NEW_ECONOMY[plant.name];
    if (!newValues) {
      console.log('[SKIP] ' + plant.name + ': Unknown plant');
      continue;
    }

    const oldCost = plant.planting_cost || 0;
    const oldHarvest = plant.harvest_points || 0;

    console.log('[UPDATE] ' + plant.name + ':');
    console.log('         Cost: ' + oldCost + ' -> ' + newValues.planting_cost);
    console.log('         Harvest: ' + oldHarvest + ' -> ' + newValues.harvest_points);

    await pb.collection('plants').update(plant.id, newValues);
  }

  console.log('\n--- New Economy ---');
  console.log('Plant          | Growth | Cost | Harvest | Profit');
  console.log('---------------|--------|------|---------|-------');

  const updated = await pb.collection('plants').getFullList({ sort: 'planting_cost' });
  for (const p of updated) {
    const profit = (p.harvest_points || 0) - (p.planting_cost || 0);
    console.log(
      String(p.name).padEnd(15) + '| ' +
      (p.growth_time_hours + 'h').padEnd(7) + '| ' +
      String(p.planting_cost).padEnd(5) + '| ' +
      String(p.harvest_points).padEnd(8) + '| +' + profit
    );
  }

  console.log('\nDone!');
}

main();
