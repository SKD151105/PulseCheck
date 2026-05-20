import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

const getGsiState = () => {
  if (!window.__gsiState) {
    window.__gsiState = { initialized: false, clientId: null, callback: null };
  }

  return window.__gsiState;
};

const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Failed to load Google sign-in"));
    document.head.appendChild(script);
  });

export default function GoogleSignInButton({ onCredential, onError, text = "continue_with" }) {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const [isReady, setIsReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!clientId || !buttonRef.current) {
      return undefined;
    }

    let isMounted = true;
    const gsiState = getGsiState();
    gsiState.callback = ({ credential }) => {
      if (credential) {
        onCredentialRef.current?.(credential);
      } else {
        onErrorRef.current?.("Google sign-in did not return a credential.");
      }
    };

    loadGoogleScript()
      .then((google) => {
        if (!isMounted || !google?.accounts?.id || !buttonRef.current) {
          return;
        }

        if (!gsiState.initialized || gsiState.clientId !== clientId) {
          google.accounts.id.initialize({
            client_id: clientId,
            auto_select: false,
            callback: (payload) => gsiState.callback?.(payload),
          });
          gsiState.initialized = true;
          gsiState.clientId = clientId;
        }

        buttonRef.current.innerHTML = "";
        google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 320,
          text,
        });

        setIsReady(true);
      })
      .catch((error) => {
        onErrorRef.current?.(error.message || "Failed to load Google sign-in.");
      });

    return () => {
      isMounted = false;
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [clientId, text]);

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        className="auth-social auth-social--disabled"
      >
        Google sign-in unavailable
      </button>
    );
  }

  return (
    <div className="auth-social">
      <div ref={buttonRef} className="auth-social__button" />
      {!isReady ? <span className="auth-social__loading">Loading Google sign-in...</span> : null}
    </div>
  );
}
