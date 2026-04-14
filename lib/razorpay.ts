import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RazorpayOrderData {
  order_id: string;
  amount: number;   // in paise
  currency: string;
  key_id: string;
}

export interface RazorpayPaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// ─── Step 1: Create Order via Supabase Edge Function ──────────────────────────

/**
 * Calls the `razorpay-create-order` Edge Function to securely create
 * a Razorpay Order on the server side.
 *
 * @param amount - Amount in ₹ (e.g. 2000 for ₹2,000)
 * @param receipt - Optional receipt ID for your records
 * @param notes - Optional key-value metadata
 */
export async function createRazorpayOrder(
  amount: number,
  receipt?: string,
  notes?: Record<string, string>,
): Promise<RazorpayOrderData> {
  // Fresh access token (cached session is often expired). Web: gateway 401 + missing CORS on
  // preflight errors surfaces as type "cors" — still a JWT problem at the edge.
  const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
  let session = refreshed.session;
  if (!session?.access_token) {
    const { data: { session: s } } = await supabase.auth.getSession();
    session = s;
  }
  if (refreshErr && !session?.access_token) {
    console.warn('[razorpay] refreshSession:', refreshErr.message);
  }
  if (!session?.access_token) {
    throw new Error('Please sign in again to continue with payment.');
  }

  const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
    body: { amount, currency: 'INR', receipt, notes },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
    },
  });

  if (error) {
    if (error.context) {
      // If it's a FunctionsHttpError with context, we can await its text if it's a blob.
      console.error('[razorpay] Function HTTP error context:', error.context);
    }
    throw new Error(error.message || 'Failed to create payment order');
  }

  // Handle expected application-level errors returned with HTTP 200
  if (data?.error) {
    console.error('[razorpay] Application Error:', data.error, data.details);
    throw new Error(data.details ? `${data.error}: ${JSON.stringify(data.details)}` : data.error);
  }

  if (!data?.order_id || !data?.key_id) {
    throw new Error('Invalid response from payment server');
  }

  return data as RazorpayOrderData;
}

// ─── Step 2a: Open Razorpay Checkout (native only) ────────────────────────────

/**
 * Opens the native Razorpay Checkout with a server-generated order_id.
 * Returns the payment result including signature for server-side verification.
 */
export async function openRazorpayCheckout(
  orderData: RazorpayOrderData,
  options: {
    name?: string;
    description?: string;
    image?: string;
    prefill?: { contact?: string; email?: string; name?: string };
    theme?: { color?: string };
  } = {},
): Promise<RazorpayPaymentResult> {
  if (Platform.OS === 'web') {
    throw new Error('Use openRazorpayWebCheckout for web platform');
  }

  const RazorpayCheckout = require('react-native-razorpay').default;

  const checkoutOptions = {
    key: orderData.key_id,
    amount: orderData.amount,
    currency: orderData.currency,
    order_id: orderData.order_id,
    name: options.name || 'Voltfly',
    description: options.description || 'Payment',
    image: options.image || 'https://voltfly.in/assets/logo.png',
    prefill: options.prefill || {},
    theme: options.theme || { color: '#1A56DB' },
    retry: { enabled: true, max_count: 4 },
  };

  const result = await RazorpayCheckout.open(checkoutOptions);
  return result as RazorpayPaymentResult;
}

// ─── Step 2b: Open Razorpay Checkout (web) ────────────────────────────────────

/**
 * Loads the Razorpay JS SDK and opens the web checkout modal.
 */
async function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return;
  if ((window as any).Razorpay) return; // Already loaded

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      console.log('[razorpay] Web SDK loaded');
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay SDK. Please check your internet connection.'));
    };
    document.head.appendChild(script);
  });
}

export async function openRazorpayWebCheckout(
  orderData: RazorpayOrderData,
  options: {
    name?: string;
    description?: string;
    prefill?: { contact?: string; email?: string; name?: string };
  } = {},
): Promise<RazorpayPaymentResult> {
  await loadRazorpayScript();

  const RazorpayConstructor = (window as any).Razorpay;
  if (!RazorpayConstructor) {
    throw new Error('Razorpay SDK not available');
  }

  return new Promise((resolve, reject) => {
    const rzpOptions = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.order_id,
      name: options.name || 'Voltfly',
      description: options.description || 'Payment',
      prefill: options.prefill || {},
      theme: { color: '#1A56DB' },
      handler: (response: RazorpayPaymentResult) => {
        console.log('[razorpay] Web payment success:', response.razorpay_payment_id);
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          reject(new Error('PAYMENT_CANCELLED'));
        },
        escape: true,
        confirm_close: true,
      },
    };

    const rzp = new RazorpayConstructor(rzpOptions);
    rzp.on('payment.failed', (response: any) => {
      console.error('[razorpay] Web payment failed:', response.error);
      reject(new Error(response.error?.description || 'Payment failed. Please try again.'));
    });
    rzp.open();
  });
}

// ─── Combined: Full Payment Flow ──────────────────────────────────────────────

/**
 * End-to-end payment: creates an order, opens checkout, returns result.
 * Works on both web and native.
 */
export async function processPayment(
  amount: number,
  options: {
    receipt?: string;
    notes?: Record<string, string>;
    description?: string;
    prefill?: { contact?: string; email?: string; name?: string };
  } = {},
): Promise<RazorpayPaymentResult> {
  // 1. Create order server-side
  console.log('[razorpay] Creating order for ₹' + amount);
  const orderData = await createRazorpayOrder(amount, options.receipt, options.notes);
  console.log('[razorpay] Order created:', orderData.order_id);

  if (Platform.OS === 'web') {
    // 2a. Open web checkout
    return openRazorpayWebCheckout(orderData, {
      description: options.description,
      prefill: options.prefill,
    });
  }

  // 2b. Open native checkout
  return openRazorpayCheckout(orderData, {
    description: options.description,
    prefill: options.prefill,
  });
}
