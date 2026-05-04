/**
 * Script to restore all plant data to original design + new economy
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'https://fwf-pocketbase-production.up.railway.app';

// Complete plant data: original weather bonuses + new economy values
const CORRECT_PLANT_DATA: Record<string, {
  growth_time_hours: number;
  planting_cost: number;
  harvest_points: number;
  weather_bonus: { sunny: number; cloudy: number; rainy: number };
  image_path: string;
}> = {
  'Sunflower': {
    growth_time_hours: 4,
    planting_cost: 0,
    harvest_points: 6,
    weather_bonus: { sunny: 1.5, cloudy: 0.8, rainy: 0.6 },
    image_path: 'sunflower',
  },
  'Mushroom': {
    growth_time_hours: 2,
    planting_cost: 4,
    harvest_points: 10,
    weather_bonus: { sunny: 0.4, cloudy: 1.2, rainy: 2.0 },  // Strongest rainy bonus
    image_path: 'mushroom',
  },
  'Fern': {
    growth_time_hours: 6,
    planting_cost: 12,
    harvest_points: 24,
    weather_bonus: { sunny: 0.7, cloudy: 1.8, rainy: 1.3 },  // CLOUDY LOVER
    image_path: 'fern',
  },
  'Cactus': {
    growth_time_hours: 3,
    planting_cost: 6,
    harvest_points: 14,
    weather_bonus: { sunny: 2.0, cloudy: 0.6, rainy: 0.3 },  // Strongest sunny bonus
    image_path: 'cactus',
  },
  'Water Lily': {
    growth_time_hours: 5,
    planting_cost: 8,
    harvest_points: 18,
    weather_bonus: { sunny: 0.5, cloudy: 1.0, rainy: 1.8 },
    image_path: 'water_lily',
  },
  'Pine Tree': {
    growth_time_hours: 8,
    planting_cost: 18,
    harvest_points: 38,
    weather_bonus: { sunny: 0.8, cloudy: 1.5, rainy: 1.2 },  // CLOUDY LOVER
    image_path: 'pine_tree',
  },
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
  console.log('Restoring all plant data to correct values...\n');

  const plants = await pb.collection('plants').getFullList();

  for (const plant of plants) {
    const correctData = CORRECT_PLANT_DATA[plant.name];
    if (!correctData) {
      console.log('[SKIP] ' + plant.name + ': Unknown plant');
      continue;
    }

    console.log('[UPDATE] ' + plant.name);

    // Check each field for drift
    const updates: Record<string, any> = {};

    if (plant.growth_time_hours !== correctData.growth_time_hours) {
      console.log('  growth_time_hours: ' + plant.growth_time_hours + ' -> ' + correctData.growth_time_hours);
      updates.growth_time_hours = correctData.growth_time_hours;
    }

    if (plant.planting_cost !== correctData.planting_cost) {
      console.log('  planting_cost: ' + plant.planting_cost + ' -> ' + correctData.planting_cost);
      updates.planting_cost = correctData.planting_cost;
    }

    if (plant.harvest_points !== correctData.harvest_points) {
      console.log('  harvest_points: ' + plant.harvest_points + ' -> ' + correctData.harvest_points);
      updates.harvest_points = correctData.harvest_points;
    }

    const currentBonus = plant.weather_bonus || {};
    const correctBonus = correctData.weather_bonus;
    if (currentBonus.sunny !== correctBonus.sunny ||
        currentBonus.cloudy !== correctBonus.cloudy ||
        currentBonus.rainy !== correctBonus.rainy) {
      console.log('  weather_bonus:');
      console.log('    sunny: ' + (currentBonus.sunny || '?') + ' -> ' + correctBonus.sunny);
      console.log('    cloudy: ' + (currentBonus.cloudy || '?') + ' -> ' + correctBonus.cloudy);
      console.log('    rainy: ' + (currentBonus.rainy || '?') + ' -> ' + correctBonus.rainy);
      updates.weather_bonus = correctBonus;
    }

    if (Object.keys(updates).length > 0) {
      await pb.collection('plants').update(plant.id, updates);
      console.log('  -> Updated!');
    } else {
      console.log('  -> No changes needed');
    }
  }

  // Final verification
  console.log('\n========== FINAL STATE ==========\n');

  const updated = await pb.collection('plants').getFullList({ sort: 'planting_cost' });

  console.log('Plant          | Growth | Cost | Harvest | Profit | Loves');
  console.log('---------------|--------|------|---------|--------|-------');

  for (const p of updated) {
    const profit = (p.harvest_points || 0) - (p.planting_cost || 0);
    const wb = p.weather_bonus || {};
    const max = Math.max(wb.sunny || 0, wb.cloudy || 0, wb.rainy || 0);
    let loves = '???';
    if (max === wb.sunny) loves = 'Sunny (' + wb.sunny + 'x)';
    else if (max === wb.cloudy) loves = 'Cloudy (' + wb.cloudy + 'x)';
    else if (max === wb.rainy) loves = 'Rainy (' + wb.rainy + 'x)';

    console.log(
      String(p.name).padEnd(15) + '| ' +
      (p.growth_time_hours + 'h').padEnd(7) + '| ' +
      String(p.planting_cost).padEnd(5) + '| ' +
      String(p.harvest_points).padEnd(8) + '| +' +
      String(profit).padEnd(5) + ' | ' +
      loves
    );
  }

  console.log('\nDone! All plant data restored to correct values.');
}

main();
