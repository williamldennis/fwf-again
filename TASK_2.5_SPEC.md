# 🌟 Task 2.5: Create Achievement Screen Foundation - Specification

## Overview

Create a bottom drawer that displays user achievements, level progress, and recent XP activity. The drawer opens when users tap the XP display in the header bar, providing a comprehensive view of their progression and achievements.

## Core Requirements

### Primary Features

- **Bottom Drawer**: 90% screen height with rounded top corners
- **Level Progress Section**: Shows current level, XP progress, and next level benefits
- **Recent XP Transactions**: Display last 5-10 XP earning activities
- **Achievement Categories**: Grouped by type with progress indicators
- **Real-time Updates**: Refresh when new XP is earned
- **Haptic Feedback**: On drawer open/close

### User Experience

- **Spring Animation**: Smooth slide-up from bottom
- **Dismissible Backdrop**: Tap outside to close
- **Pull-to-Close**: Swipe down gesture to close drawer
- **Integrated Design**: Green theme matching existing XP display

## Component Architecture

```
AchievementDrawer (90% height, spring animation)
├── Level Progress Section (scrollable)
│   ├── Current Level Display
│   ├── XP Progress Bar
│   ├── XP to Next Level
│   └── "Next Level Benefits" subheader
├── Recent XP Transactions Section
│   ├── Transaction 1: "Daily Use +5 XP"
│   ├── Transaction 2: "Plant Seed +10 XP"
│   └── ... (last 5-10 transactions)
├── AchievementList
│   ├── 🌞 Daily (2/3 completed)
│   │   ├── AchievementCard
│   │   └── AchievementCard
│   ├── 🏆 Milestones (4/6 completed)
│   │   ├── AchievementCard
│   │   └── AchievementCard
│   └── ... (other categories)
└── Loading/Error states
```

## Detailed Design Specifications

### Level Progress Section

```
┌─────────────────────────────────────┐
│ 🌱 Level 15 • 1,250 / 1,400 XP     │
│ ████████████████████░░░░ 89%       │
│ 150 XP to Level 16                 │
├─────────────────────────────────────┤
│ 🎁 Next Level Benefits             │
│ Unlock: Premium plants access      │
├─────────────────────────────────────┤
│ 📊 Recent XP Activity              │
│ 🌱 Daily Use +5 XP • 2 min ago     │
│ 🌱 Plant Seed +10 XP • 5 min ago   │
│ 🌱 Harvest Plant +20 XP • 10 min ago│
├─────────────────────────────────────┤
│ 🌞 Daily (2/3 completed)           │
└─────────────────────────────────────┘
```

### Achievement Categories with Icons

- 🌞 **Daily** - Daily engagement achievements
- 🏆 **Milestones** - Planting/harvesting milestones
- 🌤️ **Weather** - Weather-based achievements
- 👥 **Social** - Friend garden achievements
- 🌱 **Collection** - Plant variety achievements

### Achievement Card Design

```
┌─────────────────────────────────────┐
│ 🌱 First Steps                     │
│ Plant your first seed              │
│ 50 XP • ✅ Completed               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🌱 Getting the Hang of It          │
│ Plant 10 total seeds               │
│ 100 XP • 7/10 seeds planted        │
│ ███████░░░ 70%                     │
└─────────────────────────────────────┘
```

## Technical Implementation

### Files to Create

1. **`src/components/AchievementDrawer.tsx`** - Main drawer component
2. **`src/components/AchievementCard.tsx`** - Individual achievement component
3. **`src/components/AchievementCategory.tsx`** - Category grouping component
4. **`src/components/LevelProgressSection.tsx`** - Level progress display
5. **`src/components/RecentXPTransactions.tsx`** - Recent transactions section
6. **`src/hooks/useAchievements.ts`** - Hook for achievement data

### Files to Modify

1. **`src/components/HeaderBar.tsx`** - Make XP display tappable
2. **`src/app/home.tsx`** - Add drawer state management

### State Management

```typescript
// In home.tsx
const [showAchievementDrawer, setShowAchievementDrawer] = useState(false);

const openAchievementDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAchievementDrawer(true);
};

const closeAchievementDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAchievementDrawer(false);
};
```

### Data Integration

- **Achievement Data**: Use existing `AchievementService.getAllAchievements()`
- **User Progress**: Use existing `AchievementService.getUserAchievements()`
- **XP Transactions**: Use existing `XPService.getUserXPHistory()`
- **Real-time Updates**: Listen to XP earning events and refresh drawer data

## Implementation Steps

### Step 1: Create Achievement Drawer Component (2.5 hours)

- [ ] Create `AchievementDrawer.tsx` with 90% height modal
- [ ] Implement spring animation slide-up from bottom
- [ ] Add dismissible backdrop and pull-to-close gesture
- [ ] Include haptic feedback on open/close
- [ ] Add rounded top corners and green theme styling

### Step 2: Add Drawer State Management (1 hour)

- [ ] Add `showAchievementDrawer` state to home screen
- [ ] Create `openAchievementDrawer` and `closeAchievementDrawer` functions
- [ ] Make XP display in HeaderBar tappable to open drawer
- [ ] Test drawer open/close animations and haptic feedback

### Step 3: Create Achievement List Components (2 hours)

- [ ] Create `AchievementCard` component with progress indicators
- [ ] Create `AchievementCategory` component with category icons
- [ ] Implement completed vs total count display
- [ ] Add visual states for unlocked vs locked achievements
- [ ] Include XP reward display for each achievement

### Step 4: Implement Achievement Data Integration (1.5 hours)

- [ ] Create `useAchievements` hook for data fetching
- [ ] Integrate with existing `AchievementService`
- [ ] Handle real-time progress updates when XP is earned
- [ ] Implement proper error handling and loading states
- [ ] Add simple caching strategy for performance

## Acceptance Criteria

### Functional Requirements

- [ ] Drawer opens when XP display in header is tapped
- [ ] Drawer displays at 90% screen height with rounded top corners
- [ ] Spring animation slides up from bottom smoothly
- [ ] Backdrop is dismissible (tap to close)
- [ ] Pull-down gesture closes drawer
- [ ] Haptic feedback triggers on open/close
- [ ] Level progress section shows current level, XP, and progress bar
- [ ] "Next Level Benefits" subheader displays upcoming unlocks
- [ ] Recent XP transactions section shows last 5-10 activities
- [ ] Achievement categories display with icons and completion counts
- [ ] Individual achievements show progress indicators
- [ ] Real-time updates when new XP is earned
- [ ] Green theme matches existing XP display

### Technical Requirements

- [ ] All components are properly typed with TypeScript
- [ ] Error handling prevents crashes
- [ ] Loading states provide good UX
- [ ] Performance is acceptable (no lag on open/close)
- [ ] Integration with existing XP and achievement services
- [ ] Proper state management and data flow

### User Experience Requirements

- [ ] Drawer feels integrated with app design
- [ ] Animations are smooth and satisfying
- [ ] Information is clearly organized and readable
- [ ] Progress indicators are intuitive
- [ ] No confusion about achievement status
- [ ] Easy to understand level progression

## Testing Strategy

### Unit Tests

- [ ] AchievementDrawer component renders correctly
- [ ] AchievementCard shows proper states (locked/unlocked)
- [ ] AchievementCategory displays correct counts
- [ ] LevelProgressSection calculates progress accurately
- [ ] RecentXPTransactions shows correct data

### Integration Tests

- [ ] Drawer opens/closes with header XP tap
- [ ] Real-time updates work when XP is earned
- [ ] Achievement progress updates correctly
- [ ] Data flows properly from services to components

### Manual Testing

- [ ] Drawer animations feel smooth
- [ ] Haptic feedback works on different devices
- [ ] Gesture interactions work intuitively
- [ ] All achievement data displays correctly
- [ ] Performance is acceptable on slower devices

## Success Metrics

### Technical Metrics

- [ ] Drawer opens in <200ms
- [ ] No memory leaks from drawer state
- [ ] Smooth 60fps animations
- [ ] No crashes during drawer interactions

### User Experience Metrics

- [ ] Users can easily find and understand their progress
- [ ] Achievement information is clear and motivating
- [ ] Drawer feels natural and integrated
- [ ] No confusion about how to close drawer

## Future Enhancements (Post-MVP)

### Potential Improvements

- **Achievement Sharing**: Share achievements with friends
- **Detailed Progress**: More granular progress tracking
- **Achievement Animations**: Celebration animations for unlocks
- **Custom Themes**: Different color themes for drawer
- **Achievement Filters**: Filter by completion status
- **Search Functionality**: Search through achievements
- **Achievement History**: Full history of all achievements earned

### Performance Optimizations

- **Virtual Scrolling**: For large achievement lists
- **Image Preloading**: For achievement icons
- **Advanced Caching**: More sophisticated caching strategies
- **Lazy Loading**: Load achievements on demand

## Dependencies

### Completed Dependencies

- ✅ Task 1.5: Create Achievement Service Foundation
- ✅ Task 1.6: Create Achievement Definitions
- ✅ Task 1.7: Add XP Display to Header
- ✅ Task 2.1: Integrate Daily XP System
- ✅ Task 2.3: Integrate XP into Harvesting Flow
- ✅ Task 2.4: Integrate Social XP (Friend Gardens)

### Required Services

- `AchievementService` - For achievement data and progress
- `XPService` - For XP transactions and level data
- `useXP` hook - For real-time XP updates

## Risk Mitigation

### Technical Risks

- **Animation Performance**: Use React Native's Animated API for smooth animations
- **Memory Usage**: Proper cleanup of drawer state and listeners
- **Data Consistency**: Handle cases where services fail gracefully

### UX Risks

- **Confusing Interface**: Clear visual hierarchy and intuitive interactions
- **Performance Issues**: Optimize rendering and data fetching
- **Accessibility**: Ensure drawer is accessible to all users

---

## Implementation Notes

### Design Philosophy

- **Mobile-First**: Bottom drawer follows modern mobile app patterns
- **Progressive Disclosure**: Show most important info (level progress) first
- **Visual Hierarchy**: Clear organization of information by importance
- **Consistent Theming**: Match existing app design language

### Code Quality Standards

- **TypeScript**: Full type safety for all components
- **Error Boundaries**: Proper error handling throughout
- **Performance**: Optimize for smooth animations and interactions
- **Accessibility**: Support for screen readers and assistive technologies

### Integration Points

- **Header XP Display**: Tappable to open drawer
- **XP Earning Events**: Real-time updates when XP is earned
- **Achievement Service**: Fetch and display achievement data
- **Level System**: Display current level and progression

---

This specification provides a comprehensive guide for implementing Task 2.5, ensuring the achievement drawer meets all requirements and provides an excellent user experience.
