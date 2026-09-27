# Accessibility Reference

Comprehensive guide for implementing accessible interfaces following WCAG 2.1 AA standards.

## Core Principles (POUR)

### Perceivable
Information and UI components must be presentable to users in ways they can perceive.

### Operable
UI components and navigation must be operable by all users.

### Understandable
Information and the operation of UI must be understandable.

### Robust
Content must be robust enough to be interpreted by a wide variety of user agents, including assistive technologies.

## Semantic HTML

### Use Appropriate Elements

**Good:**
```tsx
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Article Title</h1>
    <p>Article content...</p>
  </article>
</main>

<footer>
  <p>&copy; 2025 Company Name</p>
</footer>
```

**Bad:**
```tsx
<div class="header">
  <div class="nav">
    <div class="link">Home</div>
    <div class="link">About</div>
  </div>
</div>
```

### Heading Hierarchy

**Correct hierarchy:**
```tsx
<h1>Page Title</h1>
  <h2>Section 1</h2>
    <h3>Subsection 1.1</h3>
    <h3>Subsection 1.2</h3>
  <h2>Section 2</h2>
    <h3>Subsection 2.1</h3>
```

**Incorrect (skips levels):**
```tsx
<h1>Page Title</h1>
  <h4>Section 1</h4>  // ❌ Skips h2 and h3
```

## Keyboard Navigation

### Focus Management

```tsx
// Ensure all interactive elements are keyboard accessible
<button
  className="
    px-4 py-2
    focus:outline-none
    focus:ring-4 focus:ring-blue-500
    focus:ring-offset-2
    rounded-lg
  "
  tabIndex={0}
>
  Accessible Button
</button>

// Custom interactive elements need tabindex
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  className="cursor-pointer focus:ring-4 focus:ring-blue-500"
>
  Custom Button
</div>
```

### Tab Order

```tsx
// Use tabIndex to control focus order
<form>
  <input tabIndex={1} aria-label="First name" />
  <input tabIndex={2} aria-label="Last name" />
  <input tabIndex={3} aria-label="Email" />
  <button tabIndex={4}>Submit</button>
</form>

// Use tabIndex={-1} to remove from tab order but allow programmatic focus
<div tabIndex={-1} id="error-message">
  Error details...
</div>
```

### Skip Links

```tsx
// Allow keyboard users to skip to main content
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

<main id="main-content">
  {/* Main content */}
</main>
```

## ARIA Attributes

### Common ARIA Roles

```tsx
// Navigation landmark
<nav role="navigation" aria-label="Main navigation">
  {/* Navigation items */}
</nav>

// Banner (header)
<header role="banner">
  {/* Header content */}
</header>

// Main content
<main role="main">
  {/* Main content */}
</main>

// Complementary (sidebar)
<aside role="complementary" aria-label="Related articles">
  {/* Sidebar content */}
</aside>

// Content info (footer)
<footer role="contentinfo">
  {/* Footer content */}
</footer>

// Search
<form role="search" aria-label="Site search">
  <input type="search" aria-label="Search query" />
  <button type="submit">Search</button>
</form>
```

### ARIA Labels

```tsx
// aria-label for elements without visible text
<button aria-label="Close dialog">
  <X size={24} />
</button>

// aria-labelledby to reference another element
<div role="dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
  <p>Are you sure you want to continue?</p>
</div>

// aria-describedby for additional description
<input
  type="password"
  aria-describedby="password-requirements"
/>
<p id="password-requirements">
  Password must be at least 8 characters
</p>
```

### ARIA States

```tsx
// aria-expanded for expandable elements
<button
  aria-expanded={isOpen}
  aria-controls="dropdown-menu"
  onClick={() => setIsOpen(!isOpen)}
>
  Menu {isOpen ? <ChevronUp /> : <ChevronDown />}
</button>
<div id="dropdown-menu" hidden={!isOpen}>
  {/* Dropdown content */}
</div>

// aria-pressed for toggle buttons
<button
  aria-pressed={isPressed}
  onClick={() => setIsPressed(!isPressed)}
>
  {isPressed ? 'Pressed' : 'Not Pressed'}
</button>

// aria-selected for selectable items
<div role="tab" aria-selected={isActive}>
  Tab 1
</div>

// aria-checked for checkboxes/radio buttons
<div
  role="checkbox"
  aria-checked={isChecked}
  tabIndex={0}
  onClick={() => setIsChecked(!isChecked)}
>
  Custom Checkbox
</div>
```

### ARIA Live Regions

```tsx
// Announce changes to screen readers
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {statusMessage}
</div>

// For urgent announcements
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  {errorMessage}
</div>

// For form validation
<input
  type="email"
  aria-invalid={hasError}
  aria-describedby={hasError ? 'email-error' : undefined}
/>
{hasError && (
  <p id="email-error" role="alert">
    Please enter a valid email address
  </p>
)}
```

## Color Contrast

### Minimum Contrast Ratios (WCAG AA)

- **Normal text:** 4.5:1
- **Large text (18pt+ or 14pt+ bold):** 3:1
- **UI components and graphics:** 3:1

### Good Contrast Examples

```tsx
// High contrast text
<p className="text-slate-900 bg-white">
  Great contrast (21:1)
</p>

<p className="text-slate-700 bg-white">
  Good contrast (8:1)
</p>

// Button with good contrast
<button className="
  bg-blue-600 text-white
  hover:bg-blue-700
">
  High Contrast Button (4.5:1)
</button>
```

### Poor Contrast Examples (Avoid)

```tsx
// ❌ Insufficient contrast
<p className="text-gray-400 bg-white">
  Poor contrast (2.8:1) - fails WCAG AA
</p>

// ❌ Don't rely on color alone
<button className="bg-red-500 text-white">
  Error Button (color alone indicates state)
</button>

// ✅ Better: Use icons + color
<button className="bg-red-500 text-white flex items-center gap-2">
  <AlertCircle size={20} />
  Error: Fix Issues
</button>
```

### Tools for Checking Contrast

- Chrome DevTools: Inspect element → Accessibility tab
- Online: WebAIM Contrast Checker
- Figma: Stark plugin

## Alternative Text

### Images

```tsx
// Informative images
<img
  src="chart.png"
  alt="Bar chart showing sales increased 40% in Q4 2025"
/>

// Decorative images
<img
  src="decoration.png"
  alt=""
  role="presentation"
/>

// Functional images (buttons)
<button aria-label="Search">
  <img src="search-icon.png" alt="" />
</button>

// Complex images
<figure>
  <img
    src="complex-diagram.png"
    alt="System architecture diagram"
    aria-describedby="diagram-description"
  />
  <figcaption id="diagram-description">
    Detailed description of the system architecture showing
    three main components: frontend, API layer, and database.
    The frontend communicates with the API via REST...
  </figcaption>
</figure>
```

### Icons

```tsx
import { MagnifyingGlass, Bell, User } from '@phosphor-icons/react';

// Decorative icons (with adjacent text)
<button className="flex items-center gap-2">
  <MagnifyingGlass aria-hidden="true" />
  Search
</button>

// Functional icons (no adjacent text)
<button aria-label="Search">
  <MagnifyingGlass />
</button>

// Icons with state
<button aria-label="Notifications (3 unread)">
  <Bell />
  <span className="sr-only">3 unread notifications</span>
  <span aria-hidden="true" className="badge">3</span>
</button>
```

## Forms

### Labels and Instructions

```tsx
// Always associate labels with inputs
<div>
  <label htmlFor="email" className="block mb-1 font-medium">
    Email Address
  </label>
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    className="w-full px-4 py-2 border rounded-lg"
  />
</div>

// Group related inputs
<fieldset>
  <legend className="font-medium mb-2">Contact Preferences</legend>
  <div className="space-y-2">
    <label className="flex items-center gap-2">
      <input type="checkbox" name="email" />
      Email
    </label>
    <label className="flex items-center gap-2">
      <input type="checkbox" name="sms" />
      SMS
    </label>
  </div>
</fieldset>
```

### Error Handling

```tsx
<div>
  <label htmlFor="password" className="block mb-1 font-medium">
    Password
  </label>
  <input
    id="password"
    type="password"
    aria-invalid={hasError}
    aria-describedby="password-requirements password-error"
    className={`
      w-full px-4 py-2 border rounded-lg
      ${hasError ? 'border-red-500' : 'border-slate-300'}
    `}
  />
  <p id="password-requirements" className="text-sm text-slate-600 mt-1">
    Must be at least 8 characters
  </p>
  {hasError && (
    <p id="password-error" role="alert" className="text-sm text-red-600 mt-1">
      <AlertCircle className="inline" size={16} />
      Password is too short
    </p>
  )}
</div>
```

### Required Fields

```tsx
// Indicate required fields clearly
<label htmlFor="name" className="block mb-1 font-medium">
  Full Name
  <span className="text-red-600" aria-label="required">*</span>
</label>
<input
  id="name"
  type="text"
  required
  aria-required="true"
  className="w-full px-4 py-2 border rounded-lg"
/>

// Or use text
<label htmlFor="email" className="block mb-1 font-medium">
  Email
  <span className="text-sm font-normal text-slate-600">(required)</span>
</label>
```

## Screen Reader-Only Content

### sr-only Class

```css
/* Add to your CSS */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

### Usage Examples

```tsx
// Add context for screen readers
<button>
  <Heart />
  <span className="sr-only">Add to favorites</span>
</button>

// Provide additional context
<div>
  <h2>Products</h2>
  <span className="sr-only">Showing 24 of 100 results</span>
</div>

// Skip link
<a href="#main" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

## Focus Indicators

### Visible Focus States

```tsx
// Default focus with ring
<button className="
  px-4 py-2 rounded-lg
  bg-blue-600 text-white
  focus:outline-none
  focus:ring-4 focus:ring-blue-500
  focus:ring-offset-2
">
  Click Me
</button>

// Custom focus style
<a
  href="/page"
  className="
    underline
    focus:outline-none
    focus:ring-2 focus:ring-blue-500
    focus:rounded
  "
>
  Link Text
</a>

// Focus within containers
<div className="
  p-4 border border-slate-300 rounded-lg
  focus-within:ring-4 focus-within:ring-blue-500
  focus-within:border-blue-500
">
  <input type="text" className="w-full focus:outline-none" />
</div>
```

### Focus Management in Modals

```tsx
import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocus.current = document.activeElement;

      // Focus modal
      modalRef.current?.focus();

      // Trap focus within modal
      const handleTab = (e) => {
        if (e.key === 'Tab') {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      return () => document.removeEventListener('keydown', handleTab);
    } else {
      // Restore focus
      previousFocus.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="bg-white rounded-lg p-6 max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-slate-200 rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
}
```

## Testing Checklist

### Automated Testing

```bash
# Install axe-core for accessibility testing
npm install --save-dev @axe-core/react

# Use in tests
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing

**Keyboard Navigation:**
- [ ] Can navigate entire site using Tab key
- [ ] Can activate all interactive elements with Enter/Space
- [ ] Focus indicators are clearly visible
- [ ] No keyboard traps
- [ ] Logical tab order

**Screen Reader Testing:**
- [ ] Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] All images have appropriate alt text
- [ ] Headings create logical structure
- [ ] Forms have proper labels
- [ ] Dynamic content is announced

**Visual Testing:**
- [ ] Text has sufficient contrast (4.5:1 minimum)
- [ ] UI works at 200% zoom
- [ ] Content reflows properly on mobile
- [ ] No information conveyed by color alone
- [ ] Focus indicators are visible

**Tools to Use:**
- Chrome DevTools Lighthouse
- WAVE browser extension
- axe DevTools browser extension
- Color contrast analyzer
- Screen reader (NVDA/VoiceOver)

## Common Patterns

### Accessible Modal

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  className="fixed inset-0 z-50 flex items-center justify-center"
>
  <div className="fixed inset-0 bg-black/50" onClick={onClose} />
  <div className="relative bg-white rounded-lg p-6 max-w-md">
    <h2 id="modal-title" className="text-xl font-bold mb-2">
      Confirm Action
    </h2>
    <p id="modal-description" className="text-slate-600 mb-4">
      Are you sure you want to proceed?
    </p>
    <div className="flex gap-4">
      <button
        onClick={onConfirm}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Confirm
      </button>
      <button
        onClick={onClose}
        className="px-4 py-2 border border-slate-300 rounded-lg"
      >
        Cancel
      </button>
    </div>
  </div>
</div>
```

### Accessible Tabs

```tsx
function Tabs({ tabs }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div role="tablist" aria-label="Content sections">
        {tabs.map((tab, index) => (
          <button
            key={index}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`panel-${index}`}
            id={`tab-${index}`}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            className={`
              px-4 py-2 border-b-2
              ${activeTab === index
                ? 'border-blue-600 font-medium'
                : 'border-transparent'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={index}
          role="tabpanel"
          id={`panel-${index}`}
          aria-labelledby={`tab-${index}`}
          hidden={activeTab !== index}
          className="p-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

### Accessible Tooltip

```tsx
function Tooltip({ text, children }) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  return (
    <div className="relative inline-block">
      <button
        aria-describedby={isVisible ? tooltipId : undefined}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </button>
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className="
            absolute z-10 px-3 py-2
            bg-slate-900 text-white text-sm
            rounded-lg
            bottom-full left-1/2 -translate-x-1/2 mb-2
          "
        >
          {text}
        </div>
      )}
    </div>
  );
}
```

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
