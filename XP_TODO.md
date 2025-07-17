# 🌱 XP System MVP Implementation TODO

## Overview

This document breaks down the XP and Levels system MVP implementation into systematic, actionable tasks based on the XP_LEVELS_SPEC.md. Each task is designed to be completed independently with clear acceptance criteria.

## Phase 1: Foundation (Week 1-2)

### Database Setup

#### Task 1.1: Create XP Transactions Table

- **Priority**: Critical
- **Estimated Time**: 2 hours
- **Dependencies**: None
- **Acceptance Criteria**:
    - Table `xp_transactions` created with columns:
        - `id` (uuid, primary key)
        - `user_id` (uuid, foreign key to profiles)
        - `amount` (integer, XP earned)
        - `action_type` (text, e.g., 'daily_use', 'plant_seed', 'harvest_plant')
        - `description` (text, human-readable description)
        - `context_data` (jsonb, additional action context)
        - `created_at` (timestamp)
    - Proper indexes on `user_id` and `created_at`
    - RLS policies for user data isolation

#### Task 1.2: Extend Profiles Table with XP Fields

- **Priority**: Critical
- **Estimated Time**: 1 hour
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
    - Add columns to `profiles` table:
        - `total_xp` (integer, default 0)
        - `current_level` (integer, default 1)
        - `xp_to_next_level` (integer, calculated field)
    - Migration script handles existing users
    - Default values for new users

#### Task 1.3: Create User Achievements Table

- **Priority**: Critical
- **Estimated Time**: 2 hours
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
    - Table `user_achievements` created with columns:
        - `id` (uuid, primary key)
        - `user_id` (uuid, foreign key to profiles)
        - `achievement_id` (text, unique achievement identifier)
        - `unlocked_at` (timestamp)
        - `progress_data` (jsonb, current progress for multi-step achievements)
    - Unique constraint on `(user_id, achievement_id)`
    - RLS policies for user data isolation

### Core Services

#### Task 1.4: Create XP Service Foundation

- **Priority**: Critical
- **Estimated Time**: 4 hours
- **Dependencies**: Tasks 1.1, 1.2
- **Acceptance Criteria**:
    - `XPService` class with methods:
        - `awardXP(userId, amount, actionType, description, context?)`
        - `getUserXP(userId)` - returns total XP and level info
        - `calculateLevel(totalXP)` - calculates level from XP
        - `getXPToNextLevel(currentLevel)` - returns XP needed for next level
    - Proper error handling and logging
    - Database transaction safety
    - Unit tests for core calculations

#### Task 1.5: Create Achievement Service Foundation

- **Priority**: Critical
- **Estimated Time**: 6 hours
- **Dependencies**: Tasks 1.3, 1.4
- **Acceptance Criteria**:
    - `AchievementService` class with methods:
        - `checkAndAwardAchievements(userId, actionType, context?)`
        - `getUserAchievements(userId)` - returns unlocked and progress
        - `getAllAchievements()` - returns achievement definitions
        - `updateProgress(userId, achievementId, progress)`
    - Achievement definitions as constants
    - Server-side achievement checking logic
    - Progress tracking for multi-step achievements

#### Task 1.6: Create Achievement Definitions

- **Priority**: High
- **Estimated Time**: 3 hours
- **Dependencies**: Task 1.5
- **Acceptance Criteria**:
    - Achievement constants defined for:
        - Daily engagement (daily_use)
        - Planting milestones (first_seed, 10_seeds, etc.)
        - Harvesting milestones (first_harvest, 25_harvests, etc.)
        - Social achievements (friend_garden_visit, etc.)
        - Weather achievements (sunny_planting, etc.)
        - Collection achievements (all_plant_types, etc.)
    - Each achievement has: id, name, description, XP reward, requirements
    - Progress tracking logic for multi-step achievements

### UI Foundation

#### Task 1.7: Add XP Display to Header

- **Priority**: High
- **Estimated Time**: 2 hours
- **Dependencies**: Task 1.4
- **Acceptance Criteria**:
    - XP display added to HeaderBar component
    - Shows "🌱 [XP] Green Thumbs" and "Level [X]"
    - Non-tappable initially (Phase 2)
    - Real-time updates when XP changes
    - Proper styling and responsive design

#### Task 1.8: Create XP Progress Bar Component

- **Priority**: Medium
- **Estimated Time**: 2 hours
- **Dependencies**: Task 1.4
- **Acceptance Criteria**:
    - `XPProgressBar` component
    - Visual progress toward next level
    - Shows current XP and XP needed for next level
    - Smooth animations and proper styling
    - Reusable component for different contexts

## Phase 2: Core Integration (Week 3-4)

### XP Earning Integration

#### Task 2.1: Integrate Daily XP System ✅

- **Status**: Complete
- **Completion Date**: 2024-12-19
- **Notes**: Integrated daily XP system into app initialization and foreground state changes
- **Testing**: All existing tests passing
- **Integration**: Integrated with XPService and useXP hook
- **Features**:
    - Daily XP awarded on app launch (once per day)
    - Checks for daily XP when app comes to foreground
    - Resets at midnight local time (handled by database)
    - Prevents duplicate daily awards
    - Updates XP display in real-time

#### Task 2.2: Integrate XP into Planting Flow

- **Priority**: Critical
- **Estimated Time**: 4 hours
- **Dependencies**: Tasks 1.4, 1.5, 2.1
- **Acceptance Criteria**:
    - 10 XP awarded for each seed planted
    - Achievement checking after successful planting
    - Non-blocking integration (try-catch wrapped)
    - Progress tracking for planting milestones
    - Weather bonus XP for optimal planting

#### Task 2.3: Integrate XP into Harvesting Flow

- **Priority**: Critical
- **Estimated Time**: 4 hours
- **Dependencies**: Tasks 1.4, 1.5, 2.2
- **Acceptance Criteria**:
    - 20 XP awarded for each mature plant harvested
    - Achievement checking after successful harvesting
    - Non-blocking integration (try-catch wrapped)
    - Progress tracking for harvesting milestones
    - Collection achievement progress updates

#### Task 2.4: Integrate Social XP (Friend Gardens)

- **Priority**: Medium
- **Estimated Time**: 3 hours
- **Dependencies**: Tasks 1.4, 1.5, 2.2
- **Acceptance Criteria**:
    - 25 XP awarded for planting in friend gardens
    - Social achievement progress tracking
    - Friend garden visit detection
    - Multi-friend garden achievement progress

### Achievement Screen

#### Task 2.5: Create Achievement Screen Foundation

- **Priority**: High
- **Estimated Time**: 6 hours
- **Dependencies**: Tasks 1.5, 1.6
- **Acceptance Criteria**:
    - `AchievementScreen` component
    - Navigation from header XP display
    - Achievement list with categories (Daily, Milestones, Weather, Social, Collection)
    - Progress indicators for multi-step achievements
    - Unlocked vs locked achievement states

#### Task 2.6: Implement Achievement Categories

- **Priority**: Medium
- **Estimated Time**: 4 hours
- **Dependencies**: Task 2.5
- **Acceptance Criteria**:
    - Category tabs/filters (Daily, Milestones, Weather, Social, Collection)
    - Achievement cards with progress bars
    - Completion status indicators
    - XP reward display for each achievement

#### Task 2.7: Add Achievement Progress Tracking

- **Priority**: High
- **Estimated Time**: 3 hours
- **Dependencies**: Tasks 2.5, 2.6
- **Acceptance Criteria**:
    - Real-time progress updates in achievement screen
    - Progress bars for multi-step achievements (e.g., "7/10 seeds planted")
    - Achievement unlock animations
    - Progress persistence across app sessions

### Level System

#### Task 2.8: Implement Level Calculation

- **Priority**: Critical
- **Estimated Time**: 2 hours
- **Dependencies**: Task 1.4
- **Acceptance Criteria**:
    - Level calculation based on XP_LEVELS_SPEC table
    - XP to next level calculation
    - Level benefits lookup system
    - Level progression validation

#### Task 2.9: Create Level Up Celebration

- **Priority**: Medium
- **Estimated Time**: 4 hours
- **Dependencies**: Tasks 2.8, 1.7
- **Acceptance Criteria**:
    - Level up modal with celebration animation
    - "🎉 Level Up! You're now Level [X]!" message
    - New level benefits preview
    - Confetti/sparkles animation
    - Sound effect (optional)

## Phase 3: Polish (Week 5-6)

### User Experience Enhancements

#### Task 3.1: Implement Retroactive Achievement Calculation

- **Priority**: High
- **Estimated Time**: 4 hours
- **Dependencies**: Tasks 1.5, 1.6
- **Acceptance Criteria**:
    - Retroactive calculation on first app launch after XP system
    - Award XP for already-completed achievements
    - "Welcome back!" message with total XP earned
    - Proper handling of existing user data

#### Task 3.2: Add XP History/Transaction Log

- **Priority**: Low
- **Estimated Time**: 3 hours
- **Dependencies**: Tasks 1.1, 2.5
- **Acceptance Criteria**:
    - XP transaction history in achievement screen
    - Paginated list of recent XP earnings
    - Transaction details (action, amount, timestamp)
    - Optional feature (can be disabled)

#### Task 3.3: Implement Achievement Notifications

- **Priority**: Medium
- **Estimated Time**: 3 hours
- **Dependencies**: Tasks 1.5, 2.5
- **Acceptance Criteria**:
    - Non-blocking achievement unlock notifications
    - Toast notifications for minor achievements
    - Modal notifications for major milestones
    - Notification preferences (can be disabled)

### Performance & Stability

#### Task 3.4: Implement XP Caching

- **Priority**: Medium
- **Estimated Time**: 2 hours
- **Dependencies**: Tasks 1.4, 1.5
- **Acceptance Criteria**:
    - Cache user XP and level data
    - Cache achievement state
    - Efficient cache invalidation
    - Fallback to database queries

#### Task 3.5: Add Error Handling & Graceful Degradation

- **Priority**: Critical
- **Estimated Time**: 3 hours
- **Dependencies**: All Phase 1 & 2 tasks
- **Acceptance Criteria**:
    - XP system failures don't break core features
    - Proper error logging and monitoring
    - User-friendly error messages
    - Automatic retry mechanisms

#### Task 3.6: Performance Optimization

- **Priority**: Medium
- **Estimated Time**: 2 hours
- **Dependencies**: All previous tasks
- **Acceptance Criteria**:
    - Efficient database queries
    - Optimized achievement checking
    - Minimal impact on app performance
    - Memory usage optimization

### Testing & Quality Assurance

#### Task 3.7: Comprehensive Unit Testing

- **Priority**: Critical
- **Estimated Time**: 6 hours
- **Dependencies**: All core services
- **Acceptance Criteria**:
    - XP calculation accuracy tests
    - Level progression logic tests
    - Achievement checking tests
    - Database transaction tests
    - Error handling tests

#### Task 3.8: Integration Testing

- **Priority**: High
- **Estimated Time**: 4 hours
- **Dependencies**: All integration tasks
- **Acceptance Criteria**:
    - XP earning during planting flow
    - Level up during harvesting
    - Header bar XP display updates
    - Real-time XP synchronization
    - Achievement screen functionality

#### Task 3.9: User Acceptance Testing

- **Priority**: High
- **Estimated Time**: 2 hours
- **Dependencies**: All tasks
- **Acceptance Criteria**:
    - XP earning feels rewarding
    - Level progression is satisfying
    - Benefits are clear and valuable
    - No confusion about XP vs. points
    - Performance meets expectations

## Post-MVP Enhancements (Future Phases)

### Advanced Features

- Real-time progress updates across components
- Complex friend garden queries and achievements
- Achievement versioning system
- Offline sync capabilities
- Social features (leaderboards, garden tours)
- Seasonal events and bonus XP
- Monetization integration (XP boosters, level skips)

### Analytics & Monitoring

- XP earning analytics dashboard
- User retention by level tracking
- Achievement completion rates
- Performance monitoring
- Error tracking and alerting

## Success Metrics & Validation

### MVP Success Criteria

- **User Engagement**: Daily active users increase by 15%
- **Retention**: Users return to check achievements (measured by achievement screen visits)
- **Performance**: No measurable impact on existing features (<5% performance degradation)
- **Stability**: Zero crashes related to XP system
- **Data Integrity**: No XP or achievement data corruption

### Testing Checklist

- [ ] XP calculations are accurate across all scenarios
- [ ] Level progression follows specification exactly
- [ ] Achievements unlock at correct thresholds
- [ ] Daily XP resets properly at midnight
- [ ] Weather bonuses work correctly
- [ ] Social achievements track properly
- [ ] Header display updates in real-time
- [ ] Achievement screen shows correct progress
- [ ] Level up celebrations trigger appropriately
- [ ] Error handling prevents feature breakage

## Risk Mitigation

### Technical Risks

- **Database Performance**: Implement proper indexing and caching
- **Real-time Updates**: Use efficient state management and avoid excessive re-renders
- **Data Consistency**: Server-side validation and transaction safety
- **User Experience**: Non-blocking operations and graceful error handling

### Business Risks

- **User Confusion**: Clear UI/UX and help documentation
- **Engagement Drop**: Monitor metrics and iterate based on user feedback
- **Performance Impact**: Comprehensive testing and optimization
- **Scalability**: Design for future growth and feature expansion

---

## Task Tracking Template

For each task, track:

- [ ] **Status**: Not Started / In Progress / Review / Complete
- [ ] **Assigned To**: Developer name
- [ ] **Start Date**: YYYY-MM-DD
- [ ] **Completion Date**: YYYY-MM-DD
- [ ] **Notes**: Any blockers, decisions, or important details
- [ ] **Testing**: Unit tests written and passing
- [ ] **Integration**: Integrated with dependent systems
- [ ] **Documentation**: Code documented and README updated

## Completed Tasks

### Task 1.1: Create XP Transactions Table ✅

- **Status**: Complete
- **Completion Date**: 2024-12-19
- **Notes**: Created comprehensive SQL migration with xp_transactions table, RLS policies, and database functions
- **Testing**: Validated through service tests
- **Integration**: Integrated with XP Service

### Task 1.2: Extend Profiles Table with XP Fields ✅

- **Status**: Complete
- **Completion Date**: 2024-12-19
- **Notes**: Extended profiles table with XP fields in the same migration as Task 1.1
- **Testing**: Validated through service tests
- **Integration**: Integrated with XP Service

### Task 1.3: Create User Achievements Table ✅

- **Status**: Complete
- **Completion Date**: 2024-12-19
- **Notes**: Created user_achievements table with proper constraints and RLS policies
- **Testing**: Validated through service tests
- **Integration**: Integrated with Achievement Service

### Task 1.4: Create XP Service Foundation ✅

- **Status**: Complete
- **Completion Date**: 2024-12-19
- **Notes**: Created comprehensive XPService with all core methods, error handling, and database integration
- **Testing**: 50 unit tests written and passing
- **Integration**: Integrated with database functions and Achievement Service

### Task 1.5: Create Achievement Service Foundation ✅

- **Status**: Complete
- **Completion Date**: 2024-12-19
- **Notes**: Created AchievementService with achievement definitions, checking logic, and XP integration
- **Testing**: 50 unit tests written and passing
- **Integration**: Integrated with XP Service and database functions

### Task 1.6: Create Achievement Definitions ✅

- **Status**: Complete
- **Completion Date**: 2024-12-19
- **Notes**: Achievement definitions included in AchievementService with 11 achievements across 5 categories
- **Testing**: Validated through service tests
- **Integration**: Integrated with achievement checking logic

### Task 1.7: Add XP Display to Header ✅

- **Status**: Complete
- **Completion Date**: 2024-12-19
- **Notes**: Created useXP hook, updated HeaderBar to display XP and level, integrated into home screen. Fixed database function ambiguity issue.
- **Testing**: 6 unit tests written and passing for useXP hook
- **Integration**: Integrated with XP Service and home screen
- **UI**: XP display shows 🌱 [XP] and Level [X] in header with green styling

## Daily Standup Questions

For each active task:

1. What did you accomplish yesterday?
2. What are you working on today?
3. Are there any blockers or dependencies?
4. Do you need help from other team members?
5. Any decisions that need to be made?

---

This TODO list provides a systematic approach to building the XP system MVP while maintaining quality, performance, and user experience standards.
