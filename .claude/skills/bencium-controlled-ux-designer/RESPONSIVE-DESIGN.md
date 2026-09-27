# Responsive Design Reference

Detailed reference for implementing responsive, mobile-first designs.

## Mobile-First Approach

Always start with mobile design, then progressively enhance for larger screens.

**Why Mobile-First:**
- Forces focus on essential content
- Easier to scale up than scale down
- Better performance on mobile devices
- Aligns with usage patterns (mobile-first web)

## Breakpoint Strategy

### Standard Breakpoints

```css
/* Mobile First Approach */
/* Base styles: 0-640px (mobile) */

/* Small tablets and large phones */
@media (min-width: 640px) { }

/* Tablets */
@media (min-width: 768px) { }

/* Small laptops */
@media (min-width: 1024px) { }

/* Desktops */
@media (min-width: 1280px) { }

/* Large desktops */
@media (min-width: 1536px) { }
```

### Specific Breakpoint Ranges

| Range | Pixels | Target Devices | Layout Strategy |
|-------|--------|----------------|-----------------|
| **XS** | 0-479px | Small phones (iPhone SE, older Android) | Single column, stacked navigation, large touch targets (min 44px) |
| **SM** | 480-767px | Large phones (iPhone 14, most modern phones) | Single column, simplified UI, bottom navigation, reduced complexity |
| **MD** | 768-1023px | Tablets (iPad, Android tablets) | 2 columns possible, sidebar navigation, some desktop features |
| **LG** | 1024-1439px | Small laptops, landscape tablets | Multi-column layouts, full navigation, desktop UI patterns |
| **XL** | 1440px+ | Desktop monitors, large screens | Max-width containers, multi-panel layouts, advanced features visible |

**Mobile Simplification Examples:**

- **Navigation**: Hamburger menu (mobile) → Full nav bar (desktop)
- **Forms**: Stacked fields (mobile) → Side-by-side fields (desktop)
- **Content**: Single column (mobile) → Multi-column grid (desktop)
- **Actions**: Fixed bottom bar (mobile) → Inline buttons (desktop)
- **Tables**: Collapsed cards (mobile) → Full data table (desktop)
- **Sidebars**: Hidden/collapsible (mobile) → Always visible (desktop)
- **Filters**: Modal/drawer (mobile) → Sidebar panel (desktop)

### Tailwind Responsive Classes

```tsx
<div className="
  w-full          // mobile: full width
  sm:w-1/2        // small: half width
  md:w-1/3        // medium: third width
  lg:w-1/4        // large: quarter width
">
  Responsive width
</div>
```

## Responsive Images

### Using srcset for Responsive Images

```tsx
<img
  src="image-800w.jpg"
  srcSet="
    image-400w.jpg 400w,
    image-800w.jpg 800w,
    image-1200w.jpg 1200w
  "
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 50vw,
    33vw
  "
  alt="Descriptive alt text"
  loading="lazy"
/>
```

### Next.js Image Component

```tsx
import Image from 'next/image';

<Image
  src="/hero-image.jpg"
  alt="Descriptive alt text"
  width={1200}
  height={600}
  priority // for above-the-fold images
  className="w-full h-auto"
/>
```

## Responsive Typography

### Fluid Typography with Tailwind

```tsx
<h1 className="
  text-3xl      // mobile: 30px
  sm:text-4xl   // small: 36px
  md:text-5xl   // medium: 48px
  lg:text-6xl   // large: 60px
">
  Responsive Headline
</h1>
```

### Fluid Typography with CSS Clamp

```css
h1 {
  /* min: 2rem (32px), preferred: 5vw, max: 4rem (64px) */
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.2;
}

p {
  /* min: 1rem (16px), preferred: 2.5vw, max: 1.25rem (20px) */
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  line-height: 1.6;
}
```

## Responsive Layouts

### CSS Grid Responsive Pattern

```tsx
<div className="
  grid
  grid-cols-1        // mobile: 1 column
  sm:grid-cols-2     // small: 2 columns
  md:grid-cols-3     // medium: 3 columns
  lg:grid-cols-4     // large: 4 columns
  gap-4              // consistent gap
">
  {items.map(item => (
    <Card key={item.id}>{item.content}</Card>
  ))}
</div>
```

### Flexbox Responsive Pattern

```tsx
<div className="
  flex
  flex-col           // mobile: stack vertically
  md:flex-row        // medium+: horizontal layout
  gap-6
  items-center
">
  <div className="w-full md:w-1/2">Content Left</div>
  <div className="w-full md:w-1/2">Content Right</div>
</div>
```

## Touch-Friendly Interfaces

### Touch Target Sizing

```tsx
// Minimum 44x44px touch targets
<button className="
  min-w-[44px]
  min-h-[44px]
  px-4 py-2
  rounded-lg
  touch-manipulation // prevents 300ms tap delay
">
  Tap Me
</button>
```

### Touch Gestures

```tsx
// Consider common mobile gestures
<div className="
  overflow-x-auto    // horizontal scroll
  snap-x             // snap scrolling
  snap-mandatory
  overscroll-contain // prevent bounce on mobile
">
  {/* Scrollable content */}
</div>
```

## Navigation Patterns

### Mobile Menu Pattern

```tsx
import { useState } from 'react';
import { List, X } from '@phosphor-icons/react';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <List size={24} />}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="
          fixed inset-0 z-50 bg-white
          md:hidden
        ">
          <nav className="p-6 space-y-4">
            {/* Navigation items */}
          </nav>
        </div>
      )}

      {/* Desktop navigation */}
      <nav className="hidden md:flex gap-6">
        {/* Navigation items */}
      </nav>
    </>
  );
}
```

### Sticky Navigation

```tsx
<header className="
  sticky top-0 z-40
  bg-white/80
  backdrop-blur-md
  border-b border-slate-200
">
  <nav className="container mx-auto px-4 py-4">
    {/* Navigation content */}
  </nav>
</header>
```

## Responsive Forms

### Form Layout Pattern

```tsx
<form className="space-y-6">
  {/* Full width on mobile, side-by-side on desktop */}
  <div className="
    grid
    grid-cols-1
    md:grid-cols-2
    gap-4
  ">
    <div>
      <label htmlFor="firstName" className="block text-sm font-medium mb-1">
        First Name
      </label>
      <input
        id="firstName"
        type="text"
        className="
          w-full px-4 py-2
          border border-slate-300
          rounded-lg
          focus:ring-2 focus:ring-blue-500
          touch-manipulation
        "
      />
    </div>

    <div>
      <label htmlFor="lastName" className="block text-sm font-medium mb-1">
        Last Name
      </label>
      <input
        id="lastName"
        type="text"
        className="
          w-full px-4 py-2
          border border-slate-300
          rounded-lg
          focus:ring-2 focus:ring-blue-500
          touch-manipulation
        "
      />
    </div>
  </div>

  {/* Full width textarea */}
  <div>
    <label htmlFor="message" className="block text-sm font-medium mb-1">
      Message
    </label>
    <textarea
      id="message"
      rows={4}
      className="
        w-full px-4 py-2
        border border-slate-300
        rounded-lg
        focus:ring-2 focus:ring-blue-500
        touch-manipulation
      "
    />
  </div>

  <button
    type="submit"
    className="
      w-full md:w-auto
      px-8 py-3
      bg-blue-600 text-white
      rounded-lg
      hover:bg-blue-700
      transition-colors
      touch-manipulation
    "
  >
    Submit
  </button>
</form>
```

## Responsive Content Hiding

### Show/Hide Based on Screen Size

```tsx
<div>
  {/* Show only on mobile */}
  <div className="block md:hidden">
    Mobile content
  </div>

  {/* Show only on tablet and up */}
  <div className="hidden md:block">
    Desktop content
  </div>

  {/* Show only on desktop */}
  <div className="hidden lg:block">
    Large screen content
  </div>
</div>
```

## Performance Optimization

### Lazy Loading Images

```tsx
<img
  src="image.jpg"
  alt="Description"
  loading="lazy"
  className="w-full h-auto"
/>
```

### Responsive Video

```tsx
<div className="relative aspect-video">
  <video
    className="absolute inset-0 w-full h-full object-cover"
    poster="thumbnail.jpg"
    controls
    preload="metadata"
  >
    <source src="video-mobile.mp4" media="(max-width: 640px)" />
    <source src="video-desktop.mp4" />
  </video>
</div>
```

## Testing Responsive Designs

### Browser DevTools

1. Open Chrome/Firefox DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test common breakpoints:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - iPad Pro (1024px)
   - Desktop (1280px+)

### Real Device Testing

**Essential devices to test:**
- Small phone (iPhone SE, Android small)
- Large phone (iPhone Pro Max, Android large)
- Tablet (iPad, Android tablet)
- Desktop (various resolutions)

### Playwright Testing

```typescript
// Use playwright MCP to test responsive breakpoints
await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
await page.screenshot({ path: 'mobile.png' });

await page.setViewportSize({ width: 768, height: 1024 }); // iPad
await page.screenshot({ path: 'tablet.png' });

await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
await page.screenshot({ path: 'desktop.png' });
```

## Common Responsive Patterns

### Card Grid

```tsx
<div className="
  grid
  grid-cols-1
  sm:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-4
  gap-6
  p-4
">
  {items.map(item => (
    <article
      key={item.id}
      className="
        bg-white
        rounded-lg
        border border-slate-200
        overflow-hidden
        hover:shadow-lg
        transition-shadow
      "
    >
      <img
        src={item.image}
        alt={item.title}
        className="w-full h-48 object-cover"
        loading="lazy"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
        <p className="text-slate-600">{item.description}</p>
      </div>
    </article>
  ))}
</div>
```

### Hero Section

```tsx
<section className="
  relative
  min-h-screen
  flex items-center
  px-4 sm:px-6 lg:px-8
">
  <div className="
    max-w-7xl mx-auto w-full
    grid grid-cols-1 lg:grid-cols-2
    gap-12
    items-center
  ">
    <div className="space-y-6">
      <h1 className="
        text-4xl sm:text-5xl lg:text-6xl
        font-bold
        tracking-tight
      ">
        Your Headline Here
      </h1>
      <p className="
        text-lg sm:text-xl
        text-slate-600
        max-w-2xl
      ">
        Supporting description that works across all screen sizes.
      </p>
      <div className="
        flex flex-col sm:flex-row
        gap-4
      ">
        <button className="
          px-8 py-3
          bg-blue-600 text-white
          rounded-lg
          hover:bg-blue-700
          transition-colors
        ">
          Primary Action
        </button>
        <button className="
          px-8 py-3
          border-2 border-slate-300
          rounded-lg
          hover:border-slate-400
          transition-colors
        ">
          Secondary Action
        </button>
      </div>
    </div>
    <div className="
      relative
      aspect-square
      rounded-2xl
      overflow-hidden
    ">
      <img
        src="hero-image.jpg"
        alt="Hero"
        className="w-full h-full object-cover"
      />
    </div>
  </div>
</section>
```

## Accessibility Considerations

### Focus Management on Mobile

```tsx
<button
  className="
    focus:outline-none
    focus:ring-4 focus:ring-blue-500
    focus:ring-offset-2
    rounded-lg
  "
  aria-label="Descriptive label"
>
  Action
</button>
```

### Skip Links

```tsx
<a
  href="#main-content"
  className="
    sr-only
    focus:not-sr-only
    focus:absolute
    focus:top-4 focus:left-4
    focus:z-50
    focus:px-4 focus:py-2
    focus:bg-blue-600 focus:text-white
    focus:rounded-lg
  "
>
  Skip to main content
</a>
```

## Best Practices Summary

✅ **Do:**
- Start with mobile design first
- Use relative units (rem, em, %) for flexibility
- Test on real devices, not just emulators
- Ensure touch targets are at least 44x44px
- Use semantic HTML for better accessibility
- Implement lazy loading for images and videos
- Optimize assets for mobile networks
- Use CSS Grid and Flexbox for flexible layouts
- Provide adequate spacing between interactive elements

❌ **Don't:**
- Design for desktop first and scale down
- Use fixed pixel widths for layout containers
- Rely solely on browser DevTools for testing
- Make touch targets too small
- Forget keyboard navigation
- Load all images eagerly
- Use large unoptimized images on mobile
- Use complex nested tables for layout
- Place important actions in hard-to-reach areas
