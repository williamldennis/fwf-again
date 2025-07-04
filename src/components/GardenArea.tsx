import React from 'react';
import { View, TouchableOpacity, Image, Text, Alert } from 'react-native';
import { GardenAreaProps, GrowthStage } from '../types/garden';

// Helper to get the correct image for a plant stage
const getPlantImage = (plantName: string, stage: GrowthStage) => {
  const plantNameLower = plantName.toLowerCase();
  switch (stage) {
    case 1:
      return require('../../assets/images/plants/empty_pot.png');
    case 2:
      return require('../../assets/images/plants/dirt.png');
    case 3:
      return require(`../../assets/images/plants/${plantNameLower}/sprout.png`);
    case 4:
      return require(`../../assets/images/plants/${plantNameLower}/adolescent.png`);
    case 5:
      return require(`../../assets/images/plants/${plantNameLower}/mature.png`);
    default:
      return require('../../assets/images/plants/empty_pot.png');
  }
};

const SLOT_COUNT = 3;

export const GardenArea: React.FC<GardenAreaProps> = ({
  gardenOwnerId,
  plants,
  weatherCondition,
  onPlantPress,
  isGardenFull,
}) => {
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
                source={require('../../assets/images/plants/empty_pot.png')}
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
              source={getPlantImage(plant.plant_name, stage)}
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