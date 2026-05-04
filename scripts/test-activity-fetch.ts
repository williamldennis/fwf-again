/**
 * Test fetching activities with both raw fetch and PocketBase SDK
 * to see if created field is returned
 *
 * Run with: npx tsx scripts/test-activity-fetch.ts
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'https://fwf-pocketbase-production.up.railway.app';

async function testFetch() {
  console.log('🔍 Testing activity fetch methods...\n');

  // Method 1: Raw fetch (what the app currently uses)
  console.log('=== Method 1: Raw fetch ===');
  const rawResponse = await fetch(`${POCKETBASE_URL}/api/collections/garden_activities/records?perPage=1`);
  const rawData = await rawResponse.json();
  if (rawData.items?.[0]) {
    console.log('Fields:', Object.keys(rawData.items[0]));
    console.log('created:', rawData.items[0].created);
    console.log('updated:', rawData.items[0].updated);
  }

  console.log('\n=== Method 2: PocketBase SDK ===');
  const pb = new PocketBase(POCKETBASE_URL);
  const sdkData = await pb.collection('garden_activities').getList(1, 1);
  if (sdkData.items?.[0]) {
    console.log('Fields:', Object.keys(sdkData.items[0]));
    console.log('created:', sdkData.items[0].created);
    console.log('updated:', sdkData.items[0].updated);
  }

  console.log('\n=== Raw record object ===');
  console.log(JSON.stringify(sdkData.items?.[0], null, 2));
}

testFetch().catch(console.error);
