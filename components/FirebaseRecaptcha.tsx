import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { firebaseConfig, auth } from '@/lib/init-firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

// Conditionally import WebView — only available on native
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').default;
  } catch (e) {
    console.warn('[FirebaseRecaptcha] WebView not available:', (e as Error).message);
  }
}

export interface FirebaseRecaptchaRef {
  sendOtp: (phone: string) => void;
}

interface Props {
  onSuccess: (verificationId: string) => void;
  onError: (error: string) => void;
}

const HTML_CONTENT = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-auth-compat.js"></script>
    <style>
      body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: transparent; }
      #recaptcha-container { display: flex; justify-content: center; align-items: center; }
    </style>
  </head>
  <body>
    <div id="recaptcha-container"></div>
    <script>
      try {
        firebase.initializeApp(${JSON.stringify(firebaseConfig)});
        const auth = firebase.auth();
        
        // Setup RecaptchaVerifier
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
          'size': 'invisible',
          'callback': function(response) {
            // reCAPTCHA solved
          },
          'expired-callback': function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: 'reCAPTCHA expired' }));
          }
        });

        // Listen for requests from React Native
        window.addEventListener('message', async (event) => {
          let data;
          try {
            data = JSON.parse(event.data);
          } catch(e) { return; }

          if (data.type === 'sendOtp') {
            try {
              const confirmationResult = await auth.signInWithPhoneNumber(data.phone, window.recaptchaVerifier);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'success',
                verificationId: confirmationResult.verificationId
              }));
            } catch (error) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: error.message }));
            }
          }
        });
        
        // Tell RN we are ready
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
      } catch (err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: 'Setup failed: ' + err.message }));
      }
    </script>
  </body>
</html>
`;

export const FirebaseRecaptcha = forwardRef<FirebaseRecaptchaRef, Props>(
  ({ onSuccess, onError }, ref) => {
    const webViewRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(Platform.OS === 'web');
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
    const pendingPhoneRef = useRef<string | null>(null);
    const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

    // Web: Create a real DOM element for reCAPTCHA and initialize the verifier
    useEffect(() => {
      if (Platform.OS !== 'web') return;

      // Create a hidden div in the real DOM for Firebase reCAPTCHA
      const containerId = 'firebase-recaptcha-container';
      let container = document.getElementById(containerId) as HTMLDivElement | null;
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.position = 'fixed';
        container.style.bottom = '0';
        container.style.left = '0';
        container.style.zIndex = '-1';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
      }
      recaptchaContainerRef.current = container;

      // Small delay to ensure DOM is ready
      const initTimer = setTimeout(() => {
        if (recaptchaVerifierRef.current) return;
        try {
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, containerId, {
            size: 'invisible',
            callback: () => {
              console.log('[FirebaseRecaptcha] reCAPTCHA solved');
            },
            'expired-callback': () => {
              console.warn('[FirebaseRecaptcha] reCAPTCHA expired, reinitializing...');
              cleanupVerifier();
              // Will be re-created on next sendOtp
            },
          });
          console.log('[FirebaseRecaptcha] Web RecaptchaVerifier initialized');
          setIsReady(true);
        } catch (err: any) {
          console.error('[FirebaseRecaptcha] Web init error:', err.message);
          // Don't fail — will try to reinit on sendOtp
        }
      }, 300);

      return () => {
        clearTimeout(initTimer);
        cleanupVerifier();
      };
    }, []);

    const cleanupVerifier = () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
    };

    const ensureWebVerifier = async (): Promise<RecaptchaVerifier> => {
      if (recaptchaVerifierRef.current) {
        return recaptchaVerifierRef.current;
      }

      const containerId = 'firebase-recaptcha-container';
      let container = document.getElementById(containerId) as HTMLDivElement | null;
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.position = 'fixed';
        container.style.bottom = '0';
        container.style.left = '0';
        container.style.zIndex = '-1';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
      }

      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          cleanupVerifier();
        },
      });

      recaptchaVerifierRef.current = verifier;
      return verifier;
    };

    useImperativeHandle(ref, () => ({
      sendOtp: (phone: string) => {
        if (Platform.OS === 'web') {
          handleWebSendOtp(phone);
          return;
        }

        if (!isReady) {
          pendingPhoneRef.current = phone;
          return;
        }
        sendNative(phone);
      },
    }));

    const handleWebSendOtp = async (phone: string) => {
      try {
        console.log('[FirebaseRecaptcha] Web: sending OTP to', phone);
        const verifier = await ensureWebVerifier();
        const confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
        
        // Store globally on Web so we can call .confirm(code) directly in useAuth
        if (typeof window !== 'undefined') {
          (window as any).firebaseConfirmationResult = confirmationResult;
        }
        console.log('[FirebaseRecaptcha] Web: OTP sent successfully, verificationId:', confirmationResult.verificationId);
        onSuccess(confirmationResult.verificationId);
      } catch (error: any) {
        console.error('[FirebaseRecaptcha] Web: sendOtp error:', error.code, error.message);
        
        // If reCAPTCHA expired or was invalid, clean up and retry once
        if (error.message?.includes('reCAPTCHA') || error.code === 'auth/argument-error') {
          console.log('[FirebaseRecaptcha] Cleaning up verifier and retrying...');
          cleanupVerifier();
          try {
            const freshVerifier = await ensureWebVerifier();
            const confirmationResult = await signInWithPhoneNumber(auth, phone, freshVerifier);
            if (typeof window !== 'undefined') {
              (window as any).firebaseConfirmationResult = confirmationResult;
            }
            onSuccess(confirmationResult.verificationId);
            return;
          } catch (retryError: any) {
            console.error('[FirebaseRecaptcha] Web: retry also failed:', retryError.message);
            onError(retryError.message);
            return;
          }
        }
        
        onError(error.message);
      }
    };

    const sendNative = (phone: string) => {
      const msg = JSON.stringify({ type: 'sendOtp', phone });
      webViewRef.current?.injectJavaScript(`window.postMessage(${JSON.stringify(msg)}, '*')`);
    };

    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'ready') {
          setIsReady(true);
          if (pendingPhoneRef.current) {
            sendNative(pendingPhoneRef.current);
            pendingPhoneRef.current = null;
          }
        } else if (data.type === 'success') {
          onSuccess(data.verificationId);
        } else if (data.type === 'error') {
          onError(data.error);
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    };

    // Web: just need the DOM container (created via useEffect above)
    if (Platform.OS === 'web') {
      return null; // DOM container is managed directly via document.createElement
    }

    // Native: render hidden WebView
    if (!WebView) {
      // WebView not available — fail gracefully
      return null;
    }

    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <WebView
          ref={webViewRef}
          source={{ html: HTML_CONTENT, baseUrl: 'https://voltflyev.firebaseapp.com' }}
          onMessage={handleMessage}
          style={{ backgroundColor: 'transparent', flex: 1, opacity: 0 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
        />
      </View>
    );
  }
);
