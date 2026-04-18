/**
 * Top-level wrapper that scopes the portal design tokens, loads Inter, and
 * wires up the IntersectionObserver used by `.reveal` animations.
 *
 * Client component because the reveal observer needs `window`.
 */
'use client';

import { useEffect, type ReactNode } from 'react';

interface ProposalLayoutProps {
  children: ReactNode;
}

export function ProposalLayout({ children }: ProposalLayoutProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const targets = document.querySelectorAll(
      '.proposal-portal .reveal, .proposal-portal .reveal-left, .proposal-portal .reveal-right'
    );
    if (targets.length === 0) return;

    // Respect reduced motion — in that case CSS already renders them visible.
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReduced) {
      targets.forEach((el) => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
    );

    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="proposal-portal min-h-screen">
      {children}
    </div>
  );
}

export default ProposalLayout;
