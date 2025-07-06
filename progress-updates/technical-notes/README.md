# Technical Notes

This folder contains detailed technical implementation notes, architecture decisions, and code patterns used in the Garden system.

## Technical Documentation

### Database Implementation

- [Schema Design](./database-schema.md) - Complete database structure and relationships
- [Query Patterns](./query-patterns.md) - Common database queries and optimization
- [Migration Strategy](./migrations.md) - Database migration approach and versioning

### Component Architecture

- [Component Hierarchy](./component-hierarchy.md) - How components are organized and related
- [State Flow](./state-flow.md) - How data flows through the application
- [Props Interface](./props-interface.md) - Component prop definitions and validation

### Services & Utilities

- [Growth Service](./growth-service.md) - Plant growth calculation implementation
- [Image Loading](./image-loading.md) - Plant image loading and caching strategy
- [Weather Integration](./weather-integration.md) - How weather data affects plants

### Performance & Optimization

- [Image Optimization](./image-optimization.md) - Plant image loading performance
- [Database Optimization](./database-optimization.md) - Query performance and indexing
- [State Management](./state-management.md) - Efficient state updates and caching

### Testing & Quality

- [Testing Strategy](./testing-strategy.md) - Unit and integration testing approach
- [Error Handling](./error-handling.md) - Error boundaries and fallback strategies
- [Code Quality](./code-quality.md) - Linting, formatting, and code standards

## Code Patterns

### Common Patterns Used

- **Growth Calculation**: Time-based percentage calculation with weather bonuses
- **Image Loading**: Dynamic require statements with fallback handling
- **Modal Management**: Controlled modal state with backdrop dismissal
- **Database Operations**: Optimistic updates with error rollback
- **State Updates**: Batch updates for multiple plant growth calculations

### File Organization

```
src/
├── components/
│   ├── GardenArea.tsx      # Garden display component
│   ├── PlantPicker.tsx     # Plant selection modal
│   ├── Plant.tsx          # Individual plant component
│   └── PlantDetailsModal.tsx # Plant information modal
├── services/
│   ├── growthService.ts   # Growth calculation logic
│   └── timeCalculationService.ts # Time-based utilities
├── types/
│   └── garden.ts          # TypeScript interfaces
└── utils/
    └── supabase.ts        # Database connection
```

## Technical Decisions Log

- **Image Loading**: Using require() for static images vs dynamic imports
- **Growth Calculation**: Client-side vs server-side calculation approach
- **State Management**: Local state vs global state management
- **Database Design**: Normalized vs denormalized plant data storage
- **Real-time Updates**: Polling vs WebSocket vs Supabase subscriptions
