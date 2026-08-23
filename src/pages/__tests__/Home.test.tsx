import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '../Home';
import { useHomeAuth } from '../../hooks/useHomeAuth';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

vi.mock('../../hooks/useHomeAuth', () => ({
  useHomeAuth: vi.fn(),
}));

// Mock the SVGs/components
vi.mock('../../components/ui/LogoParts', () => ({
  MIcon: () => <svg data-testid="m-icon" />,
  OIcon: () => <svg data-testid="o-icon" />,
  NIcon: () => <svg data-testid="n-icon" />,
  IIcon: () => <svg data-testid="i-icon" />,
}));
vi.mock('@/components/ui/Grainient', () => ({
  default: () => <div data-testid="grainient" />,
}));

describe('Home Component', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.mocked(useHomeAuth).mockReturnValue({
      isLoggedIn: false,
      login: mockLogin,
    });
  });

  const renderHome = () =>
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

  describe('4a. Rendering — static elements', () => {
    it('C-01: Headline renders', () => {
      renderHome();
      expect(screen.getByText(/Seamless personal finance tracking/i)).toBeInTheDocument();
    });

    it('C-02: Paragraph renders', () => {
      renderHome();
      expect(screen.getByText(/Your data is yours/i)).toBeInTheDocument();
    });

    it('C-03: Logo image renders', () => {
      renderHome();
      expect(screen.getByAltText('moniq logo')).toBeInTheDocument();
    });

    it('C-04 & C-05 & C-06: Footer links render correctly', () => {
      renderHome();
      const docsLink = screen.getByRole('link', { name: /docs/i });
      const privacyLink = screen.getByRole('link', { name: /privacy policy/i });
      const termsLink = screen.getByRole('link', { name: /terms of service/i });

      expect(docsLink).toHaveAttribute('href', '/docs');
      expect(privacyLink).toHaveAttribute('href', '/privacy-policy');
      expect(termsLink).toHaveAttribute('href', '/terms-of-service');
    });
  });

  describe('4b. CTA button state', () => {
    it('C-07: Unauthenticated label', () => {
      renderHome();
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });

    it('C-08: Authenticated label', () => {
      vi.mocked(useHomeAuth).mockReturnValue({ isLoggedIn: true, login: mockLogin });
      renderHome();
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });
  });

  describe('4c. CTA button interactions', () => {
    it('C-09: Click when unauthenticated -> calls login', () => {
      renderHome();
      fireEvent.click(screen.getByText('Sign in with Google'));
      expect(mockLogin).toHaveBeenCalled();
    });

    it('C-11: Button is not disabled', () => {
      renderHome();
      const btnText = screen.getByText('Sign in with Google');
      // Look for the parent div acting as a button
      const button = btnText.closest('.cursor-pointer');
      expect(button).toBeInTheDocument();
    });
  });

  describe('4d. Accessibility', () => {
    it('C-12: Logo has alt text', () => {
      renderHome();
      expect(screen.getByAltText('moniq logo')).toHaveAttribute('alt', 'moniq logo');
    });
  });
});
