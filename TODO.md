# Fair Weather Friends - Development Priorities

## High Priority (Next 2-3 sprints)

### Foundation & Core UX

- [x] **Header Bar** - Persistent points display with access to levels, store, notifications
- [x] **Loading spinner on sign in** - Critical UX, prevents user confusion during auth
- [x] **Improve home page loading** - High impact, reduces abandonment on first impression

### Core Game Loop

- [ ] **Add progress bar for each plant** - Clear feedback on user investment
- [x] **Add XP for actions** - Planting, harvesting, planting in friend plots (engagement loops)
- [x] **TikTok style scroll** - Immersive experience, each card 90% view height with "stick" behavior

### Monetization Foundation

- [x] **Make plants cost points** - Clear value exchange and strategic choices
- [x] **Add levels for users** - Additional capabilities (more planting slots, cosmetic items)
- [ ] **Add boosters that cost points** - Fertilizer, water, greenhouse, etc. (strategic depth)

## Medium Priority (Next 4-6 weeks)

### Social Features

- [x] **Add name or username to sign up** - Essential for social features and personalization

### Polish & UX Improvements

- [ ] adjust XP so you don't level up so quickly
- [ ] **Add full forecast modal when tapping** - Improves weather feature discoverability
- [ ] **Improve weather forecast styling** - Better first impression of core feature
- [ ] **Add cosmetic upgrades to gardens** - Monetization opportunity
- [x] fix weather planting achievements
- [x] fix achievements for first time planting -- you get 400xp off the bat -- i think social planting is being counted when you plant on your own garden
      [ ] planting in friend sunny weather doesn't give sun achievement
      [] improve log in loading filtering friends is slow
      []the app on my device seems to get hung up on "filtering friends" step and "making onecall api request" step after logging in

### Technical & Security

- [ ] **OTP for phone number verification** - Security improvement
- [ ] **Check plant images aren't mature until they're mature** - Bug fix

## Lower Priority (Nice-to-have)

### Visual Polish

- [ ] **Lottie animations for night time** - Nice polish but not core
- [ ] **Improve copy for weather conditions** - Night time / clear / sunny descriptions
- [ ] **Menu styling** - Visual polish
- [ ] **Video playback quality** - Performance improvement
- [ ] **Style camera permissions screen** - UX polish
- [ ] **Remove 'retake' from selfies flow** - UX simplification
- [ ] **Make share sheet default to messages** - UX improvement
- [ ] **Improve rain selfie animation** - Visual polish
- [ ] **Improve snow selfie animation** - Visual polish

### Advanced Features

- [ ] **Allow dragging of animations on selfie screens** - Interactive feature
- [ ] **Allow tapping user's points to reveal level, progress, notifications, store** - Enhanced header functionality

## Notes

**Priority Rationale:**

- **Foundation First**: Header bar enables all other features
- **UX Critical**: Loading states prevent user abandonment
- **Engagement Core**: Progress bars and XP create feedback loops
- **Monetization Ready**: Points, levels, and boosters create revenue opportunities
- **Social Foundation**: Username enables friend features

**Implementation Strategy:**

1. Start with header bar (foundation)
2. Fix loading states (critical UX)
3. Build core game loop (progress + XP)
4. Add monetization features (points, levels, boosters)
5. Polish and enhance (TikTok scroll, styling)
