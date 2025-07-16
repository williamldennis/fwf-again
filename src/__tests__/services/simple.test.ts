describe('Simple Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle basic math', () => {
    expect(2 * 3).toBe(6);
    expect(10 / 2).toBe(5);
    expect(7 - 3).toBe(4);
  });

  it('should handle strings', () => {
    expect('hello' + ' world').toBe('hello world');
    expect('test'.length).toBe(4);
  });
}); 