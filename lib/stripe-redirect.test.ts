import { expect, test } from 'bun:test';
import { isStripeHostedURL } from './stripe-redirect';

test('accepts Stripe hosted pages', () => {
  expect(isStripeHostedURL('https://checkout.stripe.com/c/pay/cs_1')).toBe(true);
  expect(isStripeHostedURL('https://billing.stripe.com/p/session/abc')).toBe(true);
  expect(isStripeHostedURL('https://stripe.com/anything')).toBe(true);
});

test('rejects lookalikes and non-https', () => {
  expect(isStripeHostedURL('https://checkout.stripe.com.evil.example/pay')).toBe(false);
  expect(isStripeHostedURL('https://evil-stripe.com/pay')).toBe(false);
  expect(isStripeHostedURL('https://evil.example/checkout.stripe.com')).toBe(false);
  expect(isStripeHostedURL('https://checkout.stripe.com@evil.example/pay')).toBe(false);
  expect(isStripeHostedURL('http://checkout.stripe.com/pay')).toBe(false);
  expect(isStripeHostedURL('javascript:alert(1)')).toBe(false);
  expect(isStripeHostedURL('')).toBe(false);
});
