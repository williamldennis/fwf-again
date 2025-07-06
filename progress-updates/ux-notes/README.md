# UX Notes

This folder documents user experience decisions, design patterns, and user feedback for the Garden system.

## UX Documentation

### Design Patterns

- [Garden Layout](./garden-layout.md) - Visual design and layout decisions
- [Plant Picker UX](./plant-picker-ux.md) - Plant selection user experience
- [Growth Visualization](./growth-visualization.md) - How plant growth is communicated to users
- [Modal Interactions](./modal-interactions.md) - Modal behavior and dismissal patterns

### User Flows

- [Planting Flow](./planting-flow.md) - Complete user journey from tap to planted
- [Growth Monitoring](./growth-monitoring.md) - How users track plant progress
- [Garden Management](./garden-management.md) - Garden viewing and interaction patterns

### Visual Design

- [Color Scheme](./color-scheme.md) - Garden area colors and plant theming
- [Typography](./typography.md) - Text hierarchy and readability
- [Spacing & Layout](./spacing-layout.md) - Component spacing and positioning
- [Animation & Transitions](./animations.md) - Growth animations and micro-interactions

### Accessibility

- [Screen Reader Support](./screen-reader.md) - Accessibility considerations
- [Touch Targets](./touch-targets.md) - Minimum touch target sizes
- [Color Contrast](./color-contrast.md) - WCAG compliance for colors
- [Focus Management](./focus-management.md) - Keyboard navigation support

## UX Principles

### Core Principles

1. **Simplicity** - Easy to understand and use
2. **Delight** - Pleasant visual feedback and interactions
3. **Clarity** - Clear communication of plant states and growth
4. **Efficiency** - Minimal steps to complete actions
5. **Consistency** - Predictable patterns across the app

### Design Decisions

#### Garden Area

- **Height**: 60px - Provides enough space for 3 plants without overwhelming the card
- **Background**: Light green (#90EE90) - Creates garden feel without being distracting
- **Border Radius**: 8px - Matches app's design language
- **Position**: Below friend's photo and temp - Logical flow from person to their space

#### Plant Picker Modal

- **Trigger**: Tap anywhere on friend card - Discoverable and intuitive
- **Layout**: Single column list - Easy scanning and selection
- **Information**: Name, image, weather preference, growth time - All key decision factors
- **Dismissal**: Tap outside or X button - Standard modal patterns

#### Plant Growth Visualization

- **5 Stages**: Clear progression from empty to mature
- **Immediate Feedback**: Dirt appears instantly after planting
- **Weather Integration**: Growth speed reflects friend's weather
- **Visual Distinction**: Each stage clearly different from others

## User Research Notes

### Initial Assumptions

- Users want to see immediate feedback when planting
- Weather-based growth adds meaningful variety
- 3 plants per garden provides good balance of engagement vs complexity
- Friend's weather location makes the feature more personal

### Testing Considerations

- Plant picker discoverability
- Growth stage clarity
- Weather effect understanding
- Garden limit comprehension
- Cross-device consistency

### Future UX Enhancements

- Plant naming system
- Growth notifications
- Garden themes
- Plant sharing features
- Achievement system
