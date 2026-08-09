# Motion Specification Template

Detailed animation specifications for consistent motion design across projects.

## Easing Curves

### Standard Easings

**Ease-out (Entrances)**
```css
cubic-bezier(0.0, 0.0, 0.2, 1)
```
Use for: Elements entering view, expanding, appearing

**Ease-in (Exits)**
```css
cubic-bezier(0.4, 0.0, 1, 1)
```
Use for: Elements leaving view, collapsing, disappearing

**Ease-in-out (Transitions)**
```css
cubic-bezier(0.4, 0.0, 0.2, 1)
```
Use for: State changes, transformations, element swaps

**Linear (Continuous)**
```css
linear
```
Use for: Loading spinners, continuous animations, marquee scrolls

### Custom Easings

**Spring (Bouncy)**
```css
cubic-bezier(0.68, -0.55, 0.265, 1.55)
```
Use for: Playful interactions, game-like UIs, attention-grabbing

**Sharp (Quick snap)**
```css
cubic-bezier(0.4, 0.0, 0.6, 1)
```
Use for: Mechanical interactions, precise movements

## Duration Tables

### By Interaction Type

| Interaction | Duration | Easing | Example |
|-------------|----------|--------|---------|
| Button press | 100ms | ease-out | Background color change |
| Hover state | 150ms | ease-out | Underline appearing |
| Checkbox toggle | 150ms | ease-out | Checkmark animation |
| Tooltip appear | 200ms | ease-out | Tooltip fade in |
| Tab switch | 250ms | ease-in-out | Content swap |
| Accordion expand | 300ms | ease-out | Height animation |
| Modal open | 300ms | ease-out | Fade + scale up |
| Modal close | 250ms | ease-in | Fade + scale down |
| Page transition | 400ms | ease-in-out | Route change |
| Sheet slide-in | 300ms | ease-out | Bottom sheet |
| Toast notification | 300ms | ease-out | Slide in from top |

### By Element Weight

| Element Weight | Duration | Example |
|----------------|----------|---------|
| Lightweight (< 100px) | 150ms | Icons, badges, chips |
| Standard (100-500px) | 300ms | Cards, panels, list items |
| Weighty (> 500px) | 500ms | Modals, full-page transitions |

## State-Specific Animations

### Hover States

**Button Hover:**
```tsx
// Tailwind
<button className="
  bg-blue-600 hover:bg-blue-700
  transition-colors duration-150 ease-out
">
  Hover Me
</button>

// Framer Motion
<motion.button
  whileHover={{ scale: 1.02 }}
  transition={{ duration: 0.15, ease: "easeOut" }}
>
  Hover Me
</motion.button>
```

**Link Hover:**
```tsx
<a className="
  underline-offset-4
  hover:underline
  transition-all duration-200 ease-out
">
  Link Text
</a>
```

**Card Hover:**
```tsx
<div className="
  transition-all duration-200 ease-out
  hover:shadow-lg
  hover:scale-[1.02]
">
  Card Content
</div>
```

### Focus States

**Keyboard Focus:**
```tsx
<button className="
  focus:outline-none
  focus:ring-4 focus:ring-blue-500
  focus:ring-offset-2
  transition-all duration-200 ease-out
">
  Focus Me
</button>
```

**Input Focus:**
```tsx
<input className="
  border-2 border-slate-300
  focus:border-blue-500
  focus:ring-4 focus:ring-blue-200
  transition-all duration-200 ease-out
" />
```

### Active/Pressed States

**Button Press:**
```tsx
<motion.button
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.1, ease: "easeIn" }}
>
  Press Me
</motion.button>

// CSS alternative
<button className="
  active:scale-98
  transition-transform duration-100 ease-in
">
  Press Me
</button>
```

### Disabled States

**Disabled Button:**
```tsx
<button
  disabled
  className="
    bg-slate-400 text-slate-600
    opacity-50 cursor-not-allowed
    pointer-events-none
  "
>
  Disabled
</button>
```

### Loading States

**Loading Spinner:**
```tsx
<div className="
  w-8 h-8 border-4 border-slate-300
  border-t-blue-600 rounded-full
  animate-spin
">
</div>

// CSS
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

**Skeleton Loader:**
```tsx
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
</div>

// CSS
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### Success Feedback

**Checkmark Animation:**
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.5 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  <CheckCircle className="text-green-600" size={48} />
</motion.div>
```

**Toast Notification:**
```tsx
<motion.div
  initial={{ y: -100, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: -100, opacity: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
  className="bg-green-600 text-white p-4 rounded-lg"
>
  Success! Changes saved.
</motion.div>
```

### Error Feedback

**Shake Animation:**
```tsx
<motion.div
  animate={{ x: [0, -4, 4, -4, 4, 0] }}
  transition={{ duration: 0.3, ease: "easeInOut" }}
  className="border-2 border-red-500"
>
  <input type="text" />
</motion.div>

// CSS alternative
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

.shake {
  animation: shake 0.3s ease-in-out;
}
```

**Error Message Slide-in:**
```tsx
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: "auto", opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
  className="text-red-600 text-sm"
>
  Please enter a valid email address
</motion.div>
```

### Warning Feedback

**Pulse Animation:**
```tsx
<motion.div
  animate={{ scale: [1, 1.05, 1] }}
  transition={{
    duration: 0.6,
    ease: "easeInOut",
    repeat: Infinity
  }}
  className="border-2 border-amber-500"
>
  Warning Content
</motion.div>
```

### Form Validation

**Field Validation (On Blur):**
```tsx
// Validate on blur, not during typing
<input
  onBlur={(e) => {
    const isValid = validateEmail(e.target.value);
    setError(!isValid);
  }}
  className={`
    border-2 transition-all duration-200 ease-out
    ${error
      ? 'border-red-500 focus:ring-red-200'
      : 'border-slate-300 focus:ring-blue-200'
    }
  `}
/>

{error && (
  <motion.p
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-red-600 text-sm mt-1"
  >
    Please enter a valid email
  </motion.p>
)}
```

## Common Animation Patterns

### Fade In
```tsx
// Framer Motion
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  Content
</motion.div>

// CSS
.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Slide Up
```tsx
// Framer Motion
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  Content
</motion.div>

// CSS
.slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Scale + Fade (Modal)
```tsx
// Framer Motion
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  Modal content
</motion.div>
```

### Stagger Children
```tsx
// Framer Motion
<motion.ul
  initial="hidden"
  animate="visible"
  variants={{
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }}
>
  {items.map(item => (
    <motion.li
      key={item.id}
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 }
      }}
    >
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

## Performance Checklist

- [ ] Only animate `transform` and `opacity`
- [ ] Avoid animating `width`, `height`, `top`, `left`, `margin`, `padding`
- [ ] Test on mobile devices (target 60fps)
- [ ] Use `will-change` only for complex animations
- [ ] Implement `prefers-reduced-motion` media query
- [ ] Keep animation duration under 500ms for UI interactions
- [ ] Use CSS animations for simple transitions (better performance)
- [ ] Use JS animation libraries for complex, choreographed sequences

## Accessibility

```css
/* Disable or reduce animations for users who prefer less motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Implementation in React:**
```tsx
import { useReducedMotion } from 'framer-motion';

function MyComponent() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0.01 : 0.3,
        ease: "easeOut"
      }}
    >
      Content
    </motion.div>
  );
}
```

## Testing Animations

1. **Test at 60fps** on target devices
2. **Test with slow network** (does page still feel responsive?)
3. **Test with reduced motion** preferences enabled
4. **Verify animations don't block** critical user actions
5. **Check that animations add value** (remove if purely decorative)
6. **Test on low-end devices** (not just your development machine)
7. **Measure performance** with Chrome DevTools Performance tab
8. **Check for layout thrashing** (avoid reading and writing to DOM in same frame)

## Animation & Gestalt Principles

### Proximity
Animated elements that are near each other should move together to reinforce grouping:
```tsx
// Animate card and its children together
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
>
  <h3>Title</h3>
  <p>Content</p>
  <button>Action</button>
</motion.div>
```

### Similarity
Similar elements should have similar animation characteristics:
```tsx
// All buttons use same hover animation
const buttonAnimation = {
  whileHover: { scale: 1.02 },
  transition: { duration: 0.15, ease: "easeOut" }
};

<motion.button {...buttonAnimation}>Button 1</motion.button>
<motion.button {...buttonAnimation}>Button 2</motion.button>
```

### Continuity
Movement should follow natural, smooth paths:
```tsx
// Smooth curve, not jumpy angles
<motion.div
  animate={{ x: [0, 50, 100], y: [0, -25, 0] }}
  transition={{ duration: 1, ease: "easeInOut" }}
/>
```

### Figure-Ground
Important elements animate while backgrounds stay stable:
```tsx
// Background fades out, modal animates in
<>
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.5 }}
    className="fixed inset-0 bg-black"
  />
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="fixed inset-0 flex items-center justify-center"
  >
    Modal Content
  </motion.div>
</>
```

## Resources

- [Framer Motion Documentation](https://www.framer.com/motion/)
- [CSS Easing Functions](https://easings.net/)
- [Material Design Motion](https://m2.material.io/design/motion/)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
