/**
 * Voltfly Design System — Shared constants for the rider app.
 * Import `T` everywhere instead of hardcoding colors / fonts / shadows.
 */

// ─── Colors ──────────────────────────────────────────────────────────────────

export const Colors = {
  // Brand
  primary:       '#1A56DB',
  primaryLight:  '#3B82F6',
  primaryDark:   '#1E40AF',
  primaryBg:     '#EFF6FF',
  primaryBg2:    '#DBEAFE',

  // Accent / gradients
  accent:        '#6366F1',
  accentLight:   '#818CF8',

  // Neutrals
  white:         '#FFFFFF',
  background:    '#F8FAFF',
  surface:       '#FFFFFF',
  card:          '#FFFFFF',
  border:        '#E5E7EB',
  borderLight:   '#F3F4F6',
  divider:       '#F3F4F6',

  // Text
  text:          '#111827',
  textSecondary: '#374151',
  textMuted:     '#6B7280',
  textLight:     '#9CA3AF',
  textPlaceholder: '#D1D5DB',

  // Status
  success:       '#10B981',
  successBg:     '#ECFDF5',
  successDark:   '#065F46',
  warning:       '#F59E0B',
  warningBg:     '#FEF3C7',
  warningDark:   '#92400E',
  danger:        '#EF4444',
  dangerBg:      '#FEF2F2',
  dangerDark:    '#B91C1C',

  // Misc
  whatsapp:      '#25D366',
  overlay:       'rgba(0,0,0,0.5)',
  overlayLight:  'rgba(0,0,0,0.25)',
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const Font = {
  regular:    'Poppins-Regular',
  medium:     'Poppins-Medium',
  semibold:   'Poppins-SemiBold',
  bold:       'Poppins-Bold',
} as const;

/** Pre-composed text styles for common use-cases */
export const Type = {
  h1:      { fontFamily: Font.bold,     fontSize: 28, color: Colors.text } as const,
  h2:      { fontFamily: Font.bold,     fontSize: 24, color: Colors.text } as const,
  h3:      { fontFamily: Font.semibold, fontSize: 20, color: Colors.text } as const,
  title:   { fontFamily: Font.semibold, fontSize: 18, color: Colors.text } as const,
  subtitle:{ fontFamily: Font.semibold, fontSize: 16, color: Colors.text } as const,
  body:    { fontFamily: Font.regular,  fontSize: 14, color: Colors.textSecondary } as const,
  bodyMd:  { fontFamily: Font.medium,   fontSize: 14, color: Colors.textSecondary } as const,
  caption: { fontFamily: Font.regular,  fontSize: 12, color: Colors.textMuted } as const,
  captionMd:{ fontFamily: Font.medium,  fontSize: 12, color: Colors.textMuted } as const,
  label:   { fontFamily: Font.medium,   fontSize: 13, color: Colors.textSecondary } as const,
  button:  { fontFamily: Font.semibold, fontSize: 16, color: Colors.white } as const,
  buttonSm:{ fontFamily: Font.semibold, fontSize: 14, color: Colors.white } as const,
  badge:   { fontFamily: Font.semibold, fontSize: 11, color: Colors.white } as const,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  } as const,
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  } as const,
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  } as const,
  primary: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  } as const,
} as const;

// ─── Spacing & Radii ────────────────────────────────────────────────────────

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

// ─── Reusable component-level styles ────────────────────────────────────────

export const CardStyle = {
  backgroundColor: Colors.surface,
  borderRadius: Radius.xl,
  padding: 18,
  ...Shadow.md,
} as const;

export const InputStyle = {
  backgroundColor: '#F9FAFB',
  borderRadius: Radius.lg,
  borderWidth: 1.5,
  borderColor: Colors.border,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontFamily: Font.regular,
  fontSize: 15,
  color: Colors.text,
} as const;

export const ButtonPrimary = {
  height: 56,
  borderRadius: Radius.lg,
  backgroundColor: Colors.primary,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  flexDirection: 'row' as const,
  ...Shadow.primary,
} as const;

export const ButtonOutline = {
  height: 50,
  borderRadius: Radius.lg,
  borderWidth: 1.5,
  borderColor: Colors.primary,
  backgroundColor: 'transparent',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
} as const;

export const Screen = {
  flex: 1,
  backgroundColor: Colors.background,
} as const;

export const ScreenWhite = {
  flex: 1,
  backgroundColor: Colors.white,
} as const;
