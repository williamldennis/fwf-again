// __mocks__/nativewind.js
module.exports = {
  // Mock NativeWind functionality
  styled: jest.fn((component) => component),
  css: jest.fn(() => ({})),
  // Add any other exports that might be needed
}; 