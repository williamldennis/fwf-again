# 🌱 XP & Levels System Specification

## Overview

The XP and Levels system provides users with a sense of progression and achievement through "Green Thumbs" experience points. This creates engagement loops and prepares the foundation for monetization features.

## Core Concepts

### Green Thumbs (XP)

- **Currency**: Experience points earned through gardening activities
- **Display**: "🌱 1,250 Green Thumbs" in header bar
- **Purpose**: Track progress toward levels and unlock new capabilities

### Levels

- **Range**: 1-50 (expandable)
- **Benefits**: Unlock planting slots, cosmetic items, special plants
- **Display**: "Level 15" badge in header bar

## Database Schema

### XP Transactions Table

We'll create a new table to track all XP transactions. Each transaction records the user who earned the XP, the amount earned, the action that triggered it, a human-readable description, and any additional context about the action. This table will be indexed for performance to quickly retrieve a user's XP history.

### User Levels Table (extends profiles)

We'll extend the existing profiles table to include the user's total XP, current level, and XP required to reach the next level. This keeps the user's progression data easily accessible alongside their other profile information.

## XP Earning Logic

### Mixed XP Rewards System

Users earn Green Thumbs through a combination of consistent daily engagement, meaningful milestones, and social interactions. This creates both reliable progression and memorable achievement moments.

### Daily Engagement Rewards

| Action                   | XP Earned | Frequency                                    | Description                        |
| ------------------------ | --------- | -------------------------------------------- | ---------------------------------- |
| Daily App Use            | 5         | Once per day (resets at midnight local time) | Consistent daily engagement reward |
| Plant Any Seed           | 10        | Per plant                                    | Basic planting reward              |
| Harvest Mature Plant     | 20        | Per harvest                                  | Successful completion reward       |
| Plant in Friend's Garden | 25        | Per friend plant                             | Social engagement bonus            |

### Achievement Milestones

| Achievement                            | XP Earned | Description               |
| -------------------------------------- | --------- | ------------------------- |
| First Seed Planted                     | 50        | Welcome to gardening!     |
| Plant 10 Total Seeds                   | 100       | Getting the hang of it    |
| Harvest First Mature Plant             | 150       | First successful harvest  |
| Plant in First Friend's Garden         | 200       | Social gardening unlocked |
| Plant All 6 Plant Types                | 300       | Plant variety master      |
| Harvest 25 Total Plants                | 400       | Dedicated harvester       |
| Plant in 3 Different Friend Gardens    | 300       | Social butterfly          |
| Perfect Weather Planting (all optimal) | 400       | Weather master            |
| Harvest 50 Plants                      | 500       | Gardening veteran         |
| Plant in 5 Different Friend Gardens    | 400       | Community gardener        |

### Special Achievement Categories

**Weather Mastery**

- Plant in sunny weather (sunflower/cactus): 50 XP
- Plant in rainy weather (mushroom/water lily): 50 XP
- Plant in cloudy weather (fern/pine tree): 50 XP
- Plant all weather-optimized combinations: 200 XP

**Social Achievements**

- First friend garden visit: 100 XP
- Plant in 2 different friend gardens: 150 XP
- Help 3 different friends: 200 XP

**Collection Achievements**

- Harvest all plant types: 150 XP
- Plant every plant type in optimal weather: 250 XP
- Complete a full garden (all 3-5 slots): 100 XP

### Achievement Tracking

The system tracks various metrics to determine when achievements are unlocked:

- Total plants planted and harvested
- Different plant types planted
- Friend gardens visited and planted in
- Weather optimization success
- Collection completion status
- Daily engagement streaks

Each achievement can only be earned once, ensuring milestone rewards remain special and meaningful. Progress toward multi-step achievements is continuously tracked and displayed in the achievement screen, allowing users to see how close they are to unlocking each milestone.

## Level Progression

### Level Requirements

Level progression follows a carefully designed curve that starts gentle and becomes more challenging. Users begin at level 1 with 0 XP required.

| Level | Total XP Required | XP to Next Level | Description            |
| ----- | ----------------- | ---------------- | ---------------------- |
| 1     | 0                 | 100              | Starting level         |
| 2     | 100               | 150              | Beginner gardener      |
| 3     | 250               | 200              | Getting the hang of it |
| 4     | 450               | 250              | Regular gardener       |
| 5     | 700               | 300              | Experienced gardener   |
| 6     | 1,000             | 350              | Dedicated gardener     |
| 7     | 1,350             | 400              | Skilled gardener       |
| 8     | 1,750             | 450              | Advanced gardener      |
| 9     | 2,200             | 500              | Expert gardener        |
| 10    | 2,700             | 600              | Master gardener        |
| 15    | 5,700             | 800              | Elite gardener         |
| 20    | 9,700             | 1,000            | Legendary gardener     |
| 25    | 14,700            | 1,200            | Mythical gardener      |
| 30    | 20,700            | 1,400            | Divine gardener        |
| 35    | 27,700            | 1,600            | Celestial gardener     |
| 40    | 35,700            | 1,800            | Cosmic gardener        |
| 45    | 44,700            | 2,000            | Universal gardener     |
| 50    | 54,700            | -                | Master of all gardens  |

This creates a long-term progression path that keeps users engaged while maintaining reasonable achievement goals. The curve starts gentle (100 XP for level 2) and gradually increases to provide meaningful challenges for dedicated players.

### Level Benefits

| Level | Unlock           | Description                   |
| ----- | ---------------- | ----------------------------- |
| 1     | 3 planting slots | Default garden capacity       |
| 5     | 4 planting slots | More garden space             |
| 10    | 5 planting slots | Maximum garden capacity       |
| 15    | Premium plants   | Access to rare plant types    |
| 20    | Garden themes    | Cosmetic garden backgrounds   |
| 25    | Plant boosters   | Fertilizer, water, etc.       |
| 30    | Special events   | Seasonal plants, limited time |
| 35    | Garden sharing   | Share garden layouts          |
| 40    | Weather control  | Minor weather influence       |
| 45    | Plant breeding   | Create hybrid plants          |
| 50    | Master Gardener  | All features unlocked         |

## Implementation Components

### 1. XP Service

We'll create a dedicated service to handle all XP-related operations. This service will award XP for various actions, calculate user levels, retrieve XP information, and determine level benefits. This centralizes the XP logic and makes it easy to maintain and extend.

### 2. XP Transaction Types

The system will track different types of XP transactions including achievement unlocks, milestone completions, collection goals, social interactions, weather mastery, and special events. This categorization helps with analytics and debugging while ensuring each XP reward feels meaningful and special.

### 3. UI Components

- **Header XP Display**: Shows current XP and level (tappable to open achievement screen)
- **Achievement Screen**: Complete list of achievements with progress tracking, categorized by type (Daily, Milestones, Weather, Social, Collection)
- **Level Up Modal**: Celebration when user levels up
- **XP Progress Bar**: Visual progress toward next level
- **Daily Streak Display**: Shows consecutive days of app usage
- **XP History**: Transaction log (optional)

## Integration Points

### 1. Daily Engagement Tracking

The system tracks daily app usage and awards 5 XP for each day the user opens the app, resetting at midnight local time. This creates consistent daily engagement and provides reliable progression even when users aren't completing major achievements. Daily XP is awarded silently in the background with a small "+5 XP" toast notification.

### 2. Achievement Tracking

The system continuously monitors user actions to detect when achievements are unlocked. When users plant seeds, harvest plants, or interact with friend gardens, the system checks if these actions qualify for new achievements and awards XP accordingly.

### 3. Milestone Detection

Achievement detection happens in real-time during gameplay. When a user reaches a milestone like planting their 10th seed or harvesting their first mature plant, the system immediately recognizes this and awards the appropriate XP with a celebration. Progress toward multi-step achievements is tracked and displayed in the achievement screen (e.g., "7/10 seeds planted").

### 4. Header Display

The header bar will continuously display the user's current XP and level, updating in real-time when XP is earned. Tapping the XP display opens the achievement screen where users can see all available achievements categorized by type (Daily, Milestones, Weather, Social, Collection) with progress indicators showing completion status (e.g., "3/10 seeds planted").

## Level Up Experience

### Visual Feedback

1. **Level Up Animation**: Confetti, sparkles, or plant growth animation
2. **Modal Display**: "🎉 Level Up! You're now Level 15!"
3. **Benefits Preview**: Show what new features are unlocked
4. **Sound Effect**: Satisfying level-up sound

### Notification System

- **In-App**: Immediate level-up notification
- **Push**: Optional push notification for major milestones
- **Social**: Share level achievements with friends

## Analytics & Tracking

### Key Metrics

- XP earned per session
- Level progression rate
- Most popular XP-earning actions
- User retention by level
- Time to reach key levels (5, 10, 15, etc.)

### Events to Track

The system will track XP earning events, level up events, and feature unlock events. This provides insights into user behavior and helps measure the effectiveness of different features.

## Future Considerations

### Seasonal Events

- **Spring Planting**: 2x XP for all planting actions
- **Harvest Festival**: 2x XP for all harvesting
- **Weather Challenges**: Bonus XP for planting in challenging weather

### Social Features

- **XP Leaderboards**: Compare progress with friends
- **Garden Tours**: Earn XP for visiting friend gardens
- **Collaborative Goals**: Team XP challenges

### Monetization Integration

- **XP Boosters**: Temporary 2x XP multipliers
- **Level Skips**: Purchase level progression
- **Premium Plants**: Higher XP-earning plant varieties

## Migration Strategy

### Phase 1: Foundation

1. Create XP transactions table
2. Add XP fields to profiles table
3. Implement basic XP service
4. Add XP display to header

### Phase 2: Core Features

1. Integrate XP earning into planting/harvesting
2. Implement level calculation and progression
3. Add level-up celebrations
4. Create level benefits system

### Phase 3: Polish

1. Add XP history and analytics
2. Implement seasonal events
3. Add social features
4. Prepare for monetization

## Testing Strategy

### Unit Tests

- XP calculation accuracy
- Level progression logic
- Weather bonus calculations
- Database transaction integrity

### Integration Tests

- XP earning during planting flow
- Level up during harvesting
- Header bar XP display updates
- Real-time XP synchronization

### User Testing

- XP earning feels rewarding
- Level progression is satisfying
- Benefits are clear and valuable
- No confusion about XP vs. points

## MVP Implementation Strategy

### Critical Implementation Questions & Solutions

#### 1. Achievement State Tracking

**Question:** How do we track which achievements each user has unlocked?
**MVP Solution:** Create `user_achievements` table with `(user_id, achievement_id, unlocked_at, progress_data)` structure. Store progress as JSON for flexibility and easy querying.

#### 2. Achievement Checking Architecture

**Question:** Where does achievement checking happen - client vs server?
**MVP Solution:** Server-side checking for security and data integrity. Check achievements after successful database operations and cache achievement state to reduce database queries.

#### 3. Existing Flow Integration

**Question:** How do we integrate with existing planting/harvesting flows without breaking them?
**MVP Solution:** Add XP service calls as optional, non-blocking operations wrapped in try-catch blocks. If XP system fails, existing features continue to work normally.

#### 4. User Experience & Notifications

**Question:** How do we handle daily XP and achievement notifications without being disruptive?
**MVP Solution:** Award daily XP silently with small "+1 XP" toast. Show non-blocking achievement modals after action completion. Keep progress updates in achievement screen only.

#### 5. Existing User Migration

**Question:** How do we handle existing users who have already completed achievement criteria?
**MVP Solution:** Implement retroactive calculation on first app launch after XP system goes live. Award XP immediately with "Welcome back!" message.

### MVP Development Phases

#### Phase 1: Foundation (Week 1-2)

1. Create database tables (`user_achievements`, add XP fields to `profiles`)
2. Build basic XP service with server-side achievement checking
3. Add XP display to header (non-tappable initially)

#### Phase 2: Core Integration (Week 3-4)

1. Integrate XP into planting/harvesting flows (non-blocking)
2. Implement daily XP system
3. Add basic achievement screen (tappable header)

#### Phase 3: Polish (Week 5-6)

1. Add achievement notifications and celebrations
2. Implement retroactive achievement calculation
3. Add progress tracking and visual feedback

### MVP Simplifications

- **No real-time progress updates** - only in achievement screen
- **No complex friend garden queries** - start with simple achievements
- **No achievement versioning** - keep requirements static for MVP
- **No offline sync** - require internet for XP updates
- **No social features** - focus on individual progression

### MVP Success Metrics

- **User engagement**: Daily active users increase
- **Retention**: Users return to check achievements
- **Performance**: No impact on existing features
- **Stability**: No crashes or data corruption

### Risk Mitigation

- **Graceful degradation**: XP system failures don't break core features
- **Data integrity**: Server-side validation prevents cheating
- **User experience**: Non-intrusive notifications and seamless integration
- **Performance**: Caching and efficient queries prevent slowdowns

---

This specification provides a comprehensive foundation for the XP and levels system while maintaining flexibility for future enhancements and monetization features. The MVP approach prioritizes core functionality, user experience, and stability over advanced features.
