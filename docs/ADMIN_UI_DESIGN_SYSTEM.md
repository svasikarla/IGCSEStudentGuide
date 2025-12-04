# Admin UI Design System

**Version:** 1.0
**Date:** 2025-11-23
**Purpose:** Unified design system for all admin content addition and management interfaces

---

## 🎨 Design Principles

1. **Consistency** - All forms and interfaces follow the same patterns
2. **Clarity** - Clear visual hierarchy and labeling
3. **Feedback** - Immediate visual feedback for all actions
4. **Efficiency** - Streamlined workflows with minimal clicks
5. **Accessibility** - WCAG 2.1 AA compliant color contrast and keyboard navigation

---

## 🎯 Color Palette

### Primary Colors
```css
--primary-50: #f0f9ff;   /* Light background */
--primary-100: #e0f2fe;  /* Hover states */
--primary-600: #0284c7;  /* Primary actions */
--primary-700: #0369a1;  /* Primary hover */
--primary-900: #0c4a6e;  /* Dark text */
```

### Semantic Colors
```css
/* Success */
--success-50: #f0fdf4;
--success-200: #bbf7d0;
--success-600: #16a34a;
--success-700: #15803d;

/* Warning */
--warning-50: #fffbeb;
--warning-200: #fef08a;
--warning-600: #ca8a04;
--warning-700: #a16207;

/* Error */
--error-50: #fef2f2;
--error-200: #fecaca;
--error-600: #dc2626;
--error-700: #b91c1c;

/* Info */
--info-50: #eff6ff;
--info-200: #bfdbfe;
--info-600: #2563eb;
--info-700: #1d4ed8;
```

### Neutral Colors
```css
--neutral-50: #f9fafb;
--neutral-100: #f3f4f6;
--neutral-200: #e5e7eb;
--neutral-300: #d1d5db;
--neutral-600: #4b5563;
--neutral-700: #374151;
--neutral-900: #111827;
```

---

## 📐 Spacing & Sizing

### Spacing Scale
```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
```

### Border Radius
```css
--radius-sm: 0.375rem;   /* 6px - small elements */
--radius-md: 0.5rem;     /* 8px - inputs, buttons */
--radius-lg: 0.75rem;    /* 12px - cards */
--radius-xl: 1rem;       /* 16px - panels */
--radius-2xl: 1.5rem;    /* 24px - large panels */
```

### Shadows
```css
--shadow-soft: 0 1px 3px 0 rgb(0 0 0 / 0.1);
--shadow-medium: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-large: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

---

## 🧩 Component Patterns

### Page Header
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
  <div>
    <h1 className="text-3xl font-bold text-neutral-900 mb-2">Page Title</h1>
    <p className="text-neutral-600 text-lg">Description of the page purpose</p>
  </div>
  <div className="flex gap-3">
    {/* Action buttons */}
  </div>
</div>
```

### Card/Panel Container
```tsx
<div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6">
  {/* Content */}
</div>
```

### Form Section
```tsx
<div className="space-y-6">
  <div className="border-b border-neutral-200 pb-4">
    <h3 className="text-lg font-semibold text-neutral-900 mb-1">Section Title</h3>
    <p className="text-sm text-neutral-600">Section description</p>
  </div>
  {/* Form fields */}
</div>
```

### Input Field (Standard)
```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-neutral-700">
    Field Label
    {required && <span className="text-error-600 ml-1">*</span>}
  </label>
  <input
    type="text"
    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
    placeholder="Enter value..."
  />
  {error && (
    <p className="text-sm text-error-600 flex items-center gap-1">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {error}
    </p>
  )}
  {helpText && !error && (
    <p className="text-sm text-neutral-500">{helpText}</p>
  )}
</div>
```

### Textarea Field
```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-neutral-700">
    Description
  </label>
  <textarea
    rows={4}
    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
    placeholder="Enter description..."
  />
  <div className="flex justify-between items-center text-xs">
    <span className="text-neutral-500">Help text</span>
    <span className="text-neutral-400">{charCount}/500</span>
  </div>
</div>
```

### Select/Dropdown
```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-neutral-700">
    Select Option
  </label>
  <select className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white">
    <option value="">-- Select --</option>
    <option value="1">Option 1</option>
  </select>
</div>
```

### Primary Button
```tsx
<button
  type="submit"
  disabled={loading}
  className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-soft hover:shadow-medium"
>
  {loading ? (
    <span className="flex items-center gap-2">
      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      Loading...
    </span>
  ) : (
    'Submit'
  )}
</button>
```

### Secondary Button
```tsx
<button
  type="button"
  className="px-6 py-2.5 bg-white text-neutral-700 font-medium rounded-lg border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 focus:ring-4 focus:ring-neutral-200 transition-all duration-200 shadow-soft"
>
  Cancel
</button>
```

### Success Message
```tsx
<div className="bg-success-50 border border-success-200 text-success-800 p-4 rounded-xl flex items-start gap-3">
  <svg className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
  <div>
    <p className="font-semibold">Success!</p>
    <p className="text-sm mt-1">Your changes have been saved successfully.</p>
  </div>
</div>
```

### Error Message
```tsx
<div className="bg-error-50 border border-error-200 text-error-800 p-4 rounded-xl flex items-start gap-3">
  <svg className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
  <div>
    <p className="font-semibold">Error</p>
    <p className="text-sm mt-1">{errorMessage}</p>
  </div>
</div>
```

### Loading Skeleton
```tsx
<div className="animate-pulse space-y-4">
  <div className="h-10 bg-neutral-200 rounded-lg w-3/4" />
  <div className="h-6 bg-neutral-200 rounded-lg w-1/2" />
  <div className="h-32 bg-neutral-200 rounded-lg" />
</div>
```

### Stats Card
```tsx
<div className="bg-white rounded-xl border border-neutral-200 p-6 hover:shadow-medium transition-shadow">
  <div className="flex items-center justify-between mb-4">
    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* Icon */}
      </svg>
    </div>
    <span className="text-sm font-medium text-success-600 bg-success-50 px-2.5 py-1 rounded-full">
      +12%
    </span>
  </div>
  <div className="text-2xl font-bold text-neutral-900 mb-1">1,234</div>
  <div className="text-sm text-neutral-600">Stat Label</div>
</div>
```

---

## 📋 Form Best Practices

### 1. Form Structure
- Group related fields in sections
- Use clear section headings
- Provide section descriptions
- Maintain consistent spacing (space-y-6 between sections)

### 2. Field Order
1. Essential fields first (name, title, etc.)
2. Optional/advanced fields later
3. Action buttons at the bottom
4. Use "Show Advanced" toggles for advanced options

### 3. Validation
- Inline validation on blur
- Display errors immediately below fields
- Use red text and icons for errors
- Provide helpful error messages (not just "Invalid")

### 4. Loading States
- Disable form during submission
- Show spinner in submit button
- Disable all inputs during save
- Show progress indicators for multi-step operations

### 5. Success States
- Show success message at top of form
- Auto-dismiss after 3-5 seconds
- Provide "View" or "Edit" actions
- Clear form or navigate appropriately

---

## 🎭 Animation Guidelines

### Transitions
```css
/* Standard transition */
transition-all duration-200

/* Hover effects */
hover:shadow-medium hover:scale-105

/* Focus states */
focus:ring-4 focus:ring-primary-200

/* Loading spinners */
animate-spin
```

### Timing
- **Instant**: < 100ms - hover states, focus rings
- **Fast**: 150-200ms - button clicks, form submissions
- **Medium**: 300-400ms - page transitions, modals
- **Slow**: 500-700ms - complex animations, data loading

---

## ♿ Accessibility

### Keyboard Navigation
- All interactive elements focusable
- Logical tab order
- Visible focus indicators
- Escape key closes modals/dropdowns

### Screen Readers
- Use semantic HTML (button, nav, main, etc.)
- Provide aria-labels for icon-only buttons
- Use proper heading hierarchy (h1, h2, h3)
- Announce dynamic content changes

### Color Contrast
- Text on background: minimum 4.5:1
- Large text (18pt+): minimum 3:1
- Interactive elements: minimum 3:1

---

## 📱 Responsive Design

### Breakpoints
```css
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

### Mobile-First Patterns
```tsx
/* Stack on mobile, row on desktop */
<div className="flex flex-col md:flex-row gap-4">

/* Full width on mobile, constrained on desktop */
<div className="w-full lg:w-2/3">

/* Hide on mobile, show on desktop */
<div className="hidden md:block">

/* Different text sizes */
<h1 className="text-2xl md:text-3xl lg:text-4xl">
```

---

## 🧪 Testing Checklist

### Visual Testing
- [ ] All colors match design system
- [ ] Consistent border radius throughout
- [ ] Proper spacing between elements
- [ ] Shadows applied correctly
- [ ] Hover states work properly

### Functional Testing
- [ ] Form validation works
- [ ] Error messages display correctly
- [ ] Success states trigger
- [ ] Loading states show
- [ ] Responsive on all screen sizes

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announces content
- [ ] Color contrast passes WCAG AA
- [ ] Focus indicators visible
- [ ] All interactive elements accessible

---

## 📚 Component Library

All components should use this design system. Key components:

### Forms
- SubjectGeneratorForm
- ChapterForm
- TopicGeneratorForm
- QuizGeneratorForm
- ExamPaperGeneratorForm
- FlashcardGeneratorForm

### Management
- SubjectManagement
- ChapterList
- SubjectList

### Utilities
- LLMProviderSelector
- BulkContentGenerator
- ContentScrapingInterface

---

## 🔄 Updates & Maintenance

**Version History:**
- v1.0 (2025-11-23): Initial design system

**Review Schedule:**
- Monthly review of component consistency
- Quarterly accessibility audit
- Update design system as patterns evolve

---

## 📞 Contact

For questions or suggestions about the design system, please create an issue or discuss in team meetings.
