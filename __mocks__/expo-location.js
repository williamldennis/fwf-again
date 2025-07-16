module.exports = {
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 40.7128, longitude: -74.0060 }
  }),
  Accuracy: { Balanced: 3 }
}; 