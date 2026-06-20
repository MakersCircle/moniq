import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useDataStore } from '@/store/dataStore';

export default function TourDriver() {
  const tourStep = useDataStore(s => s.settings.tourStep);
  const setTourStep = useDataStore(s => s.setTourStep);
  const completeOnboarding = useDataStore(s => s.completeOnboarding);
  const navigate = useNavigate();

  const setTourStepRef = useRef(setTourStep);
  const completeOnboardingRef = useRef(completeOnboarding);
  const navigateRef = useRef(navigate);
  useEffect(() => { setTourStepRef.current = setTourStep; }, [setTourStep]);
  useEffect(() => { completeOnboardingRef.current = completeOnboarding; }, [completeOnboarding]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // Helper to reliably wait for an element to mount before highlighting
  const waitForElement = (selector: string, callback: () => void, maxWaitMs = 3000) => {
    const interval = 100;
    let elapsed = 0;
    const timer = setInterval(() => {
      if (document.querySelector(selector)) {
        clearInterval(timer);
        callback();
      } else {
        elapsed += interval;
        if (elapsed >= maxWaitMs) {
          clearInterval(timer);
        }
      }
    }, interval);
    return () => clearInterval(timer);
  };

  useEffect(() => {
    const overlaySteps = ['nav_settings', 'view_accounts', 'view_methods', 'view_categories', 'nav_new_tx', 'tour_sync_backup'];
    if (!tourStep || !overlaySteps.includes(tourStep)) return;

    let driverObj: ReturnType<typeof driver> | null = null;
    let cleanupClick: (() => void) | null = null;

    const skipTour = () => completeOnboardingRef.current([], []);

    const makeDriver = () => driver({
      showProgress: false,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.5,
      doneBtnText: 'Next →',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      onCloseClick: skipTour,
    });

    const timeout = setTimeout(() => {

      // ── Step: highlight Settings nav link ──────────────────────────
      if (tourStep === 'nav_settings') {
        driverObj = makeDriver();
        const el = document.getElementById('tour-target-settings-nav');
        try {
          // Use highlight — user advances by physically clicking the link
          driverObj?.highlight({
            element: '#tour-target-settings-nav',
            popover: {
              title: 'Step 1 — Open Settings',
              description: 'Click the Settings link in the sidebar to start setting up your ledger.',
              side: 'right',
              align: 'start',
              doneBtnText: 'Skip Tour',
            }
          });
        } catch {
          // silently fail
        }
        if (el) {
          const handler = () => setTourStepRef.current('setup_accounts');
          el.addEventListener('click', handler);
          cleanupClick = () => el.removeEventListener('click', handler);
        }
      }

      // ── Step: show Accounts page with info popover ─────────────────
      else if (tourStep === 'view_accounts') {
        navigateRef.current('/settings/accounts');

        cleanupClick = waitForElement('#tour-target-accounts-page', () => {
          driverObj = makeDriver();
          try {
            // Use drive() with setSteps so the Done button fires onNextClick
            driverObj?.setSteps([
              {
                element: '#tour-target-accounts-page',
                popover: {
                  title: 'Your Accounts',
                  description:
                    'These are the accounts you just created. Each one tracks its own balance independently. You can add more, rename, or archive any account here at any time.',
                  side: 'bottom',
                  align: 'start',
                  doneBtnText: 'Next →',
                  onNextClick: () => {
                    driverObj?.destroy();
                    setTourStepRef.current('setup_methods');
                  },
                },
              },
            ]);
            driverObj?.drive();
          } catch {
            setTourStepRef.current('setup_methods');
          }
        });
      }

      // ── Step: show Methods page with info popover ──────────────────
      else if (tourStep === 'view_methods') {
        navigateRef.current('/settings/methods');

        cleanupClick = waitForElement('#tour-target-methods-page', () => {
          driverObj = makeDriver();
          try {
            driverObj.setSteps([
              {
                element: '#tour-target-methods-page',
                popover: {
                  title: 'Payment Methods',
                  description:
                    'These are your payment methods. They link to your accounts and are used when adding transactions. You can drag to reorder them or add more any time.',
                  side: 'bottom',
                  align: 'start',
                  doneBtnText: 'Next →',
                  onNextClick: () => {
                    driverObj?.destroy();
                    setTourStepRef.current('setup_categories');
                  },
                },
              },
            ]);
            driverObj?.drive();
          } catch {
            setTourStepRef.current('setup_categories');
          }
        });
      }

      // ── Step: show Categories page with info popover ─────────────────
      else if (tourStep === 'view_categories') {
        navigateRef.current('/settings/categories');

        cleanupClick = waitForElement('#tour-target-categories-page', () => {
          driverObj = makeDriver();
          try {
            driverObj.setSteps([
              {
                element: '#tour-target-categories-page',
                popover: {
                  title: 'Your Categories',
                  description:
                    'These are your categories grouped by Needs, Wants, and Income. You can drag to reorder them or create new ones here.',
                  side: 'bottom',
                  align: 'start',
                  doneBtnText: 'Next →',
                  onNextClick: () => {
                    driverObj?.destroy();
                    setTourStepRef.current('nav_new_tx');
                  },
                },
              },
            ]);
            driverObj?.drive();
          } catch {
            setTourStepRef.current('nav_new_tx');
          }
        });
      }

      // ── Step: highlight New Transaction button ─────────────────────
      else if (tourStep === 'nav_new_tx') {
        cleanupClick = waitForElement('#tour-target-new-tx', () => {
          driverObj = makeDriver();
          try {
            driverObj.setSteps([
              {
                element: '#tour-target-new-tx',
                popover: {
                  title: 'Log a Transaction',
                  description:
                    'This is where you add new Incomes, Expenses, and Transfers to your ledger.',
                  side: 'bottom',
                  align: 'end',
                  doneBtnText: 'Next →',
                  onNextClick: () => {
                    driverObj?.destroy();
                    setTourStepRef.current('tour_sync_backup');
                  },
                },
              },
            ]);
            driverObj?.drive();
          } catch {
            setTourStepRef.current('tour_sync_backup');
          }
        });
      }

      // ── Step: Cloud sync info ──────────────────────────────────────
      else if (tourStep === 'tour_sync_backup') {
        navigateRef.current('/settings');

        cleanupClick = waitForElement('#tour-target-sync', () => {
          driverObj = makeDriver();
          try {
            driverObj.setSteps([
              {
                element: '#tour-target-sync',
                popover: {
                  title: 'Cloud Sync',
                  description:
                    "All your data syncs to your Google Drive automatically in the background. You're all set!",
                  side: 'bottom',
                  align: 'end',
                  doneBtnText: 'Finish ✓',
                  onNextClick: () => {
                    driverObj?.destroy();
                    completeOnboardingRef.current([], []);
                    setTourStepRef.current('completed');
                  },
                },
              },
            ]);
            driverObj?.drive();
          } catch {
            completeOnboardingRef.current([], []);
          }
        });
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (driverObj) driverObj.destroy();
      if (cleanupClick) cleanupClick();
    };
  }, [tourStep]);

  return null;
}
