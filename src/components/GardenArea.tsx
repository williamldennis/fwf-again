import React from 'react';
import { View, TouchableOpacity, Image, Text, Alert } from 'react-native';
import { GardenAreaProps, GrowthStage } from '../types/garden';

const plantStageImages: Record<string, Record<number, any>> = {
  sunflower: {
    3: require('../../assets/images/plants/sunflower/sprout.png'),
    4: require('../../assets/images/plants/sunflower/adolescent.png'),
    5: require('../../assets/images/plants/sunflower/mature.png'),
  },
  mushroom: {
    3: require('../../assets/images/plants/mushroom/sprout.png'),
    4: require('../../assets/images/plants/mushroom/adolescent.png'),
    5: require('../../assets/images/plants/mushroom/mature.png'),
  },
  fern: {
    3: require('../../assets/images/plants/fern/sprout.png'),
    4: require('../../assets/images/plants/fern/adolescent.png'),
    5: require('../../assets/images/plants/fern/mature.png'),
  },
  cactus: {
    3: require('../../assets/images/plants/cactus/sprout.png'),
    4: require('../../assets/images/plants/cactus/adolescent.png'),
    5: require('../../assets/images/plants/cactus/mature.png'),
  },
  water_lily: {
    3: require('../../assets/images/plants/water_lily/sprout.png'),
    4: require('../../assets/images/plants/water_lily/adolescent.png'),
    5: require('../../assets/images/plants/water_lily/mature.png'),
  },
  pine_tree: {
    3: require('../../assets/images/plants/pine_tree/sprout.png'),
    4: require('../../assets/images/plants/pine_tree/adolescent.png'),
    5: require('../../assets/images/plants/pine_tree/mature.png'),
  },
};

const emptyPotImg = require('../../assets/images/plants/empty_pot.png');
const dirtImg = require('../../assets/images/plants/dirt.png');

const SLOT_COUNT = 3;

export const GardenArea: React.FC<GardenAreaProps> = (props) => {
  console.log('GardenArea rendered', props);
  const { gardenOwnerId, plants, weatherCondition, onPlantPress, isGardenFull } = props;
  // Fill up to 3 slots with either a plant or null (for empty)
  const slots = Array(SLOT_COUNT)
    .fill(null)
    .map((_, i) => plants[i] || null);

  // Handler for empty slot tap
  const handleEmptySlotPress = () => {
    if (isGardenFull) {
      Alert.alert('Garden is full', 'Check back tomorrow.');
    } else {
      onPlantPress();
    }
  };

  const getImageForPlant = (plantName: string, stage: GrowthStage) => {
    if (stage === 1) return emptyPotImg;
    if (stage === 2) return dirtImg;
    const plantKey = plantName.toLowerCase();
    return plantStageImages[plantKey]?.[stage] || emptyPotImg;
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        backgroundColor: '#90EE90',
        borderRadius: 8,
        height: 60,
        padding: 8,
        marginTop: 8,
        marginBottom: 4,
      }}
    >
      {slots.map((plant, idx) => {
        if (!plant) {
          // Empty slot
          return (
            <TouchableOpacity
              key={idx}
              onPress={handleEmptySlotPress}
              style={{
                flex: 1,
                alignItems: 'center',
              }}
            >
              <Image
                source={emptyPotImg}
                style={{ width: 36, height: 36 }}
                resizeMode="contain"
              />
              {idx === 0 && !isGardenFull && (
                <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                  Tap to plant
                </Text>
              )}
            </TouchableOpacity>
          );
        }
        // Show plant at its current stage
        const stage = plant.current_stage as GrowthStage;
        return (
          <View key={plant.planted_plant_id} style={{ flex: 1, alignItems: 'center' }}>
            <Image
              source={getImageForPlant(plant.plant_name, stage)}
              style={{ width: 36, height: 36 }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: 10, color: '#333', marginTop: 2 }}>
              {plant.plant_name}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export default GardenArea; 