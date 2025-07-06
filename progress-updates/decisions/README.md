# Key Decisions

This folder documents major architectural and design decisions made during the Garden system development.

## Decision Records

### Database Design

- [Plant Growth Stages](./plant-growth-stages.md) - Why 5 stages and how they work
- [Weather Bonus System](./weather-bonus-system.md) - How weather affects plant growth
- [Garden Limits](./garden-limits.md) - Why 3 plants per garden maximum

### UI/UX Design

- [Garden Area Layout](./garden-area-layout.md) - Garden positioning and sizing decisions
- [Plant Picker Modal](./plant-picker-modal.md) - Modal design and interaction patterns
- [Plant Image System](./plant-image-system.md) - Image organization and loading strategy

### Technical Architecture

- [Growth Calculation](./growth-calculation.md) - How growth percentages are calculated
- [State Management](./state-management.md) - Garden state handling approach
- [Real-time Updates](./realtime-updates.md) - Update strategy for plant growth

### Game Mechanics

- [Plant Types](./plant-types.md) - Selection of initial 6 plant types
- [Growth Timing](./growth-timing.md) - Base growth rates and time calculations
- [Weather Effects](./weather-effects.md) - Specific weather bonuses for each plant

## Decision Template

Each decision record should include:

1. **Context** - What problem or opportunity led to this decision
2. **Options Considered** - Alternative approaches that were evaluated
3. **Decision** - What was chosen and why
4. **Implementation** - How the decision was implemented
5. **Outcome** - Results and any lessons learned
6. **Future Considerations** - How this decision affects future development
