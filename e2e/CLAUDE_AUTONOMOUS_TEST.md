# Autonomous Inbox Testing - Claude in Chrome

You are a QA tester. Your job is to thoroughly test the Inbox feature at https://app.isyncso.com/inbox like a real user would. Explore every feature, click every button, try edge cases, and report back what works and what doesn't.

## Your Mission

1. **Act like a real user** - Don't just check if things exist, actually USE them
2. **Try to break things** - Enter weird inputs, click rapidly, try edge cases
3. **Document everything** - Note every bug, glitch, or unexpected behavior
4. **Be thorough** - Test every visible feature, button, and interaction

## Setup

1. Navigate to https://app.isyncso.com/inbox
2. Open DevTools Console (F12 > Console tab)
3. Clear the console
4. Keep console open throughout testing to catch errors

---

## Test Everything You See

### Sidebar Testing
- [ ] Click on each channel in the list
- [ ] Try creating a new channel (+ button)
- [ ] Try creating a new DM (New Message button)
- [ ] Click on "Mentions & Reactions" special section
- [ ] Click on "Saved Items" if visible
- [ ] Try the search/filter if available
- [ ] Check if unread badges appear correctly
- [ ] Try right-clicking on channels for context menu

### Message List Testing
- [ ] Scroll through messages - does it load smoothly?
- [ ] Scroll to top - does it load older messages?
- [ ] Hover over messages - do action buttons appear?
- [ ] Click on a message - does anything happen?
- [ ] Try to react to a message with emoji
- [ ] Try to reply to a message (thread)
- [ ] Try to edit your own message
- [ ] Try to delete your own message
- [ ] Try to pin a message
- [ ] Try to forward a message
- [ ] Try to bookmark/save a message
- [ ] Check if timestamps display correctly
- [ ] Check if avatars load properly
- [ ] Check if usernames display correctly

### Message Input Testing
- [ ] Type a simple message and send it
- [ ] Type a very long message (500+ characters) and send
- [ ] Try sending an empty message (should be blocked)
- [ ] Try sending just spaces (should be blocked)
- [ ] Use keyboard shortcut Enter to send
- [ ] Use Shift+Enter for new line
- [ ] Try @mentioning someone (type @)
- [ ] Try #channel linking (type #)
- [ ] Try emoji shortcodes (type :smile:)
- [ ] Try slash commands (type /)
- [ ] Try the emoji picker button
- [ ] Try the formatting buttons (bold, italic, etc.)
- [ ] Try attaching a file (+ button)
- [ ] Try attaching an image
- [ ] Try attaching a PDF or document
- [ ] Try drag-and-drop file upload

### Channel Header Testing
- [ ] Click the channel name - does anything happen?
- [ ] Click the Info (i) button - Channel Details panel
- [ ] Click the Users button - Members panel
- [ ] Click the Pin button - Pinned messages
- [ ] Click the Search button - Search panel
- [ ] Check the connection indicator (wifi icon)

### Channel Details Panel
- [ ] Does it show channel name?
- [ ] Does it show description?
- [ ] Does it show member count?
- [ ] Does it show created date?
- [ ] Can you edit channel settings (if owner)?
- [ ] Does Moderation Settings work?
- [ ] Can you set slowmode?
- [ ] Can you archive/delete channel?

### Members Panel
- [ ] Does it list all members?
- [ ] Do role badges show (owner, admin, moderator, member)?
- [ ] Can you change member roles (if admin)?
- [ ] Can you kick members (if moderator)?
- [ ] Can you mute members?
- [ ] Does "Your role" display correctly?

### Mobile Responsiveness
- [ ] Resize browser to mobile width (<640px)
- [ ] Does hamburger menu appear?
- [ ] Does hamburger menu open/close?
- [ ] Can you navigate channels on mobile?
- [ ] Can you send messages on mobile?
- [ ] Is the input usable on mobile?

### Real-time Features
- [ ] Send a message - does it appear instantly?
- [ ] Does typing indicator work?
- [ ] Do new messages from others appear in real-time?
- [ ] Do unread counts update in real-time?

### Edge Cases to Try
- [ ] Rapidly click between channels
- [ ] Send multiple messages quickly
- [ ] Open and close panels rapidly
- [ ] Try very long channel names
- [ ] Try special characters in messages: <script>, SQL injection, etc.
- [ ] Try pasting a very long URL
- [ ] Try pasting an image directly

---

## Report Format

After testing, provide your report in this exact format:

```
# Inbox Autonomous Test Report

**Tested:** [date/time]
**URL:** https://app.isyncso.com/inbox
**Tester:** Claude (Autonomous)

## Working Features ✅
[List everything that works correctly]

## Bugs Found 🐛
[List each bug with:]
- **Bug:** [Description]
- **Steps to reproduce:** [How to trigger it]
- **Expected:** [What should happen]
- **Actual:** [What actually happens]
- **Severity:** Critical/High/Medium/Low
- **Console error:** [If any]

## UI/UX Issues 🎨
[List any usability or design problems]

## Console Errors 📋
[List all console errors seen during testing]

## Performance Issues ⚡
[List any slowness, lag, or performance problems]

## Missing Features 🚫
[List features that seem incomplete or missing]

## Recommendations 💡
[Suggest improvements based on your testing]

## Overall Assessment
**Status:** [PRODUCTION READY / NEEDS WORK / CRITICAL ISSUES]
**Summary:** [1-2 sentence summary]
```

---

## Important Notes

- Take your time - thorough testing is better than fast testing
- If something crashes, note exactly what you did before it crashed
- If the page freezes, note that too
- Test as if you're a new user who doesn't know how the app works
- Try things that a confused user might try
- Don't assume anything works - verify everything

**Begin your autonomous testing now. Report back when complete.**
