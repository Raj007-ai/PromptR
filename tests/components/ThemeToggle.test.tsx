import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Register happy-dom before importing anything from @testing-library/react
GlobalRegistrator.unregister(); // Just in case
GlobalRegistrator.register();

// Now import after registering
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ThemeToggle } from '../../components/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
  });

  afterEach(() => {
    cleanup();
  });

  test('renders correctly', () => {
    const { getByRole } = render(<ThemeToggle />);
    expect(getByRole('button')).toBeTruthy();
  });

  test('toggles theme on click', () => {
    const { getByRole } = render(<ThemeToggle />);
    const button = getByRole('button');

    // Initial state (defaults to dark mode)
    expect(document.body.classList.contains('light-mode')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('dark');

    // Click to toggle
    fireEvent.click(button);
    expect(document.body.classList.contains('light-mode')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('light');

    // Click again
    fireEvent.click(button);
    expect(document.body.classList.contains('light-mode')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  test('respects saved theme', () => {
    localStorage.setItem('theme', 'light');
    render(<ThemeToggle />);
    expect(document.body.classList.contains('light-mode')).toBe(true);
  });
});
