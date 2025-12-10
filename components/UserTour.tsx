'use client'

import { useMemo, useEffect, useState } from 'react'
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride'
import { Profile } from '@/types/database'
import { markTourCompleted } from '@/lib/utils/cookies'

interface UserTourProps {
  user: Profile
  run: boolean
  onClose: () => void
}

const baseSteps: Step[] = [
  {
    target: '[data-tour="dashboard-header"]',
    content:
      'Welcome! This dashboard summarizes your inventory, sales, and key actions for the day.',
    placement: 'bottom',
    disableBeacon: false,
  },
  {
    target: '[data-tour="nav-items"]',
    content: 'Manage your items here. Start by adding the products you track.',
    placement: 'right',
    disableBeacon: false,
  },
  {
    target: '[data-tour="nav-sales"]',
    content: 'Record sales or usage. This will automatically adjust your stock.',
    placement: 'right',
    disableBeacon: false,
  },
  {
    target: '[data-tour="nav-reports"]',
    content: 'See branch-aware reports, trends, and exports.',
    placement: 'right',
    disableBeacon: false,
  },
]

const adminSteps: Step[] = [
  {
    target: '[data-tour="nav-branches"]',
    content:
      '⚠️ IMPORTANT: Before doing anything else, create at least one branch for your business. All inventory, sales, and stock records are tied to branches. Click here to add your first branch now.',
    placement: 'right',
    disableBeacon: false,
  },
  {
    target: '[data-tour="branch-selector"]',
    content:
      'Once you have branches, use this selector to switch between branches or view all branches. Make sure to select a branch before recording sales or stock.',
    placement: 'bottom',
    disableBeacon: false,
  },
  {
    target: '[data-tour="nav-opening"]',
    content: 'Set opening stock at the start of the day to keep counts accurate.',
    placement: 'right',
    disableBeacon: false,
  },
  {
    target: '[data-tour="nav-restocking"]',
    content: 'Log restocking deliveries so stock levels stay correct.',
    placement: 'right',
    disableBeacon: false,
  },
  {
    target: '[data-tour="nav-transfers"]',
    content: 'Transfer stock between branches and keep both sides balanced.',
    placement: 'right',
    disableBeacon: false,
  },
  {
    target: '[data-tour="nav-users"]',
    content: 'Add staff, branch managers, and assign branches/roles.',
    placement: 'right',
    disableBeacon: false,
  },
]

const superAdminSteps: Step[] = [
  {
    target: '[data-tour="dashboard-header"]',
    content: 'Review organizations and branches from this admin view.',
    placement: 'auto',
  },
  {
    target: '[data-tour="nav-organizations"]',
    content: 'Manage organizations. Expand to see branches and transfers.',
    placement: 'auto',
  },
]

function getStepsForRole(user: Profile, hasBranches: boolean = false): Step[] {
  const role = user.role as string

  if (role === 'superadmin') {
    return superAdminSteps
  }

  if (role === 'tenant_admin' || role === 'admin') {
    // For tenant admins without branches, prioritize branch creation
    const branchSteps: Step[] = hasBranches
      ? adminSteps
      : [
          {
            target: '[data-tour="nav-branches"]',
            content:
              '⚠️ CRITICAL FIRST STEP: You must create at least one branch before recording any inventory, sales, or stock. All data is tied to branches. Click here to add your first branch now - this is required!',
            placement: 'right' as const,
            disableBeacon: false,
          },
        ]

    const filteredAdminSteps =
      role === 'admin'
        ? branchSteps
        : branchSteps.filter(step => step.target !== '[data-tour="nav-users"]')

    return [...filteredAdminSteps, ...baseSteps]
  }

  // Branch managers/staff do not need branch selector or user management steps
  return [...baseSteps]
}

export default function UserTour({ user, run, onClose }: UserTourProps) {
  // Use mounted state to prevent hydration mismatches
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [enhancedSteps, setEnhancedSteps] = useState<Step[]>([])
  const [hasBranches, setHasBranches] = useState(false)

  // Check if organization has branches
  useEffect(() => {
    if (!mounted || user.role === 'superadmin') return

    const checkBranches = async () => {
      try {
        const { useBranchStore } = await import('@/lib/stores/branchStore')
        const { availableBranches } = useBranchStore.getState()
        setHasBranches(availableBranches.length > 0)
      } catch {
        // Ignore errors
      }
    }

    checkBranches()
  }, [mounted, user.role])

  const baseStepsList = useMemo(() => getStepsForRole(user, hasBranches), [user, hasBranches])

  // Ensure component only renders on client
  useEffect(() => {
    // Defer state updates to avoid synchronous setState in effect
    setTimeout(() => {
      setMounted(true)
      setIsMobile(window.innerWidth < 768)
    }, 0)
  }, [])

  // Helper to extract text from element
  const getElementText = (element: Element): string => {
    // Try to get text from various sources
    const textContent = element.textContent?.trim()
    if (textContent && textContent.length < 50) return textContent // Limit length

    // Try aria-label
    const ariaLabel = element.getAttribute('aria-label')
    if (ariaLabel) return ariaLabel

    // Try title attribute
    const title = element.getAttribute('title')
    if (title) return title

    // Try label text if it's a form element
    if (element instanceof HTMLElement) {
      const id = element.id
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`)
        if (label) {
          const labelText = label.textContent?.trim()
          if (labelText && labelText.length < 50) return labelText
        }
      }
    }

    // Try parent label
    const parentLabel = element.closest('label')
    if (parentLabel) {
      const labelText = parentLabel.textContent?.trim()
      if (labelText && labelText.length < 50) return labelText
    }

    return ''
  }

  // Enhance steps with element text after mount
  useEffect(() => {
    if (!mounted) return

    // Use setTimeout to defer state update and avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      const enhanced = baseStepsList.map(step => {
        try {
          const element = document.querySelector(step.target as string)
          if (element) {
            const elementText = getElementText(element)
            if (elementText) {
              return {
                ...step,
                title: elementText,
              }
            }
          }
        } catch {
          // Ignore errors
        }
        return step
      })

      setEnhancedSteps(enhanced)
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [mounted, baseStepsList])

  const steps = enhancedSteps.length > 0 ? enhancedSteps : baseStepsList

  useEffect(() => {
    // Detect mobile screen size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleCallback = (data: CallBackProps) => {
    const { status, step, action } = data

    // When moving to a new step, ensure the target element is visible
    if ((action === 'next' || action === 'prev' || action === 'update') && step) {
      if (step.target) {
        const targetSelector = step.target as string

        // Small delay to ensure DOM is ready
        setTimeout(() => {
          const targetElement = document.querySelector(targetSelector)

          if (targetElement) {
            // For sidebar items on mobile, ensure sidebar is open first
            if (isMobile && targetSelector.includes('nav-')) {
              const sidebar = document.querySelector('[data-tour="sidebar"]')
              const sidebarButton = document.querySelector('[data-tour="sidebar-toggle"]')
              if (sidebar && !isElementVisible(sidebar) && sidebarButton) {
                // Trigger sidebar open
                ;(sidebarButton as HTMLElement).click()
                // Wait for sidebar animation, then scroll to target
                setTimeout(() => {
                  const updatedTarget = document.querySelector(targetSelector)
                  if (updatedTarget) {
                    updatedTarget.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                      inline: 'nearest',
                    })
                    // Highlight after scroll
                    updatedTarget.classList.add('tour-highlight')
                    setTimeout(() => {
                      updatedTarget.classList.remove('tour-highlight')
                    }, 1500)
                  }
                }, 400)
                return
              }
            }

            // Scroll element into view with smooth behavior
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            })

            // Add a subtle highlight animation to the target
            setTimeout(() => {
              targetElement.classList.add('tour-highlight')
              setTimeout(() => {
                targetElement.classList.remove('tour-highlight')
              }, 1500)
            }, 300)
          }
        }, 100)
      }
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      markTourCompleted()
      onClose()
    }
  }

  // Helper to check if element is visible
  const isElementVisible = (element: Element): boolean => {
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    )
  }

  if (!mounted) {
    return null
  }

  return (
    <>
      <style jsx global>{`
        .tour-highlight {
          animation: tourPulse 1s ease-in-out;
          outline: 2px solid #4f46e5;
          outline-offset: 4px;
          border-radius: 4px;
        }
        @keyframes tourPulse {
          0%,
          100% {
            outline-color: #4f46e5;
            outline-width: 2px;
          }
          50% {
            outline-color: #818cf8;
            outline-width: 3px;
          }
        }
      `}</style>
      <Joyride
        steps={steps}
        run={run}
        continuous
        showSkipButton
        showProgress
        spotlightClicks
        disableOverlayClose
        disableScrollParentFix={false}
        scrollOffset={20}
        scrollToFirstStep
        styles={{
          options: {
            primaryColor: '#4f46e5',
            zIndex: 1200,
          },
          tooltip: {
            borderRadius: 8,
            fontSize: isMobile ? '14px' : '16px',
            padding: isMobile ? '16px' : '20px',
            maxWidth: isMobile ? 'calc(100vw - 32px)' : '400px',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          tooltipTitle: {
            fontSize: isMobile ? '16px' : '18px',
            marginBottom: isMobile ? '8px' : '10px',
          },
          tooltipContent: {
            padding: isMobile ? '8px 0' : '10px 0',
            fontSize: isMobile ? '14px' : '16px',
            lineHeight: isMobile ? '1.5' : '1.6',
          },
          buttonNext: {
            fontSize: isMobile ? '14px' : '16px',
            padding: isMobile ? '10px 16px' : '12px 20px',
            minHeight: isMobile ? '44px' : '40px', // Touch-friendly on mobile
            borderRadius: 6,
          },
          buttonBack: {
            fontSize: isMobile ? '14px' : '16px',
            padding: isMobile ? '10px 16px' : '12px 20px',
            minHeight: isMobile ? '44px' : '40px',
            borderRadius: 6,
            marginRight: isMobile ? '8px' : '10px',
          },
          buttonSkip: {
            fontSize: isMobile ? '14px' : '16px',
            padding: isMobile ? '10px 16px' : '12px 20px',
            minHeight: isMobile ? '44px' : '40px',
            borderRadius: 6,
          },
          buttonClose: {
            width: isMobile ? '32px' : '28px',
            height: isMobile ? '32px' : '28px',
            padding: 0,
          },
          overlay: {
            mixBlendMode: 'normal',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
          spotlight: {
            borderRadius: 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(79, 70, 229, 0.5)',
          },
          beacon: {
            width: isMobile ? '20px' : '18px',
            height: isMobile ? '20px' : '18px',
          },
          beaconInner: {
            width: isMobile ? '20px' : '18px',
            height: isMobile ? '20px' : '18px',
          },
          beaconOuter: {
            width: isMobile ? '40px' : '36px',
            height: isMobile ? '40px' : '36px',
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip tour',
        }}
        callback={handleCallback}
      />
    </>
  )
}
