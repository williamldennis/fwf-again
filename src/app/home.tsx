import { View, Text, ScrollView } from 'react-native';

export default function Home() {
  return (
    <View style={{ flex: 1 }}>
      {/* Weather Card */}
      <View style={{ 
        backgroundColor: '#fff',
        padding: 20,
        margin: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
      }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Current Weather</Text>
        <Text style={{ fontSize: 48, fontWeight: '300', marginVertical: 10 }}>72°</Text>
        <Text style={{ fontSize: 16 }}>Sunny</Text>
      </View>

      {/* Friends List */}
      <ScrollView style={{ flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', margin: 16 }}>Friends' Weather</Text>
        
        {/* Friend Weather Items */}
        <View style={{ 
          flexDirection: 'row',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#eee'
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '500' }}>Sarah Smith</Text>
            <Text style={{ color: '#666' }}>New York, NY</Text>
          </View>
          <Text style={{ fontSize: 20 }}>65°</Text>
        </View>

        <View style={{ 
          flexDirection: 'row',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#eee'
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '500' }}>John Doe</Text>
            <Text style={{ color: '#666' }}>Los Angeles, CA</Text>
          </View>
          <Text style={{ fontSize: 20 }}>82°</Text>
        </View>

        <View style={{ 
          flexDirection: 'row',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#eee'
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '500' }}>Mike Johnson</Text>
            <Text style={{ color: '#666' }}>Chicago, IL</Text>
          </View>
          <Text style={{ fontSize: 20 }}>58°</Text>
        </View>
      </ScrollView>
    </View>
  );
}
