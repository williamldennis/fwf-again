import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image, FlatList, StyleSheet } from 'react-native';
import { Plant, PlantPickerProps } from '../types/garden';
import { GrowthService } from '../services/growthService';

const plantImages: Record<string, any> = {
  sunflower: require('../../assets/images/plants/sunflower/mature.png'),
  mushroom: require('../../assets/images/plants/mushroom/mature.png'),
  fern: require('../../assets/images/plants/fern/mature.png'),
  cactus: require('../../assets/images/plants/cactus/mature.png'),
  water_lily: require('../../assets/images/plants/water_lily/mature.png'),
  pine_tree: require('../../assets/images/plants/pine_tree/mature.png'),
};

interface PlantPickerFullProps extends PlantPickerProps {
  plants: Plant[];
}

export const PlantPicker: React.FC<PlantPickerFullProps> = ({
  visible,
  onClose,
  onSelectPlant,
  weatherCondition,
  plants,
}) => {
  console.log('PlantPicker rendered', { visible, plants });
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Choose a Plant</Text>
          <FlatList
            data={plants}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.plantRow}
                onPress={() => onSelectPlant(item.id)}
              >
                <Image
                  source={plantImages[item.image_path]}
                  style={styles.plantImage}
                  resizeMode="contain"
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.plantName}>{item.name}</Text>
                  <Text style={styles.plantDesc}>
                    {GrowthService.getWeatherPreferenceDescription(item)}
                  </Text>
                  <Text style={styles.plantDesc}>
                    {GrowthService.getGrowthTimeDescription(item.growth_time_hours)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  plantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 10,
  },
  plantImage: {
    width: 48,
    height: 48,
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  plantDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    marginTop: 18,
    alignSelf: 'center',
    backgroundColor: '#eee',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
});

export default PlantPicker; 