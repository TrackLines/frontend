// The checkout/portal URL comes from our backend, which already pins it to Stripe's own domain. This
// is the same guard in the browser, so even a tampered API response can't send someone to a lookalike
// payment page (PCI DSS: the billing redirect only ever goes to the payment provider).

// isStripeHostedURL: an https URL on Stripe's own domain (checkout.stripe.com, billing.stripe.com, or
// any other *.stripe.com host).
export function isStripeHostedURL(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  return u.protocol === 'https:' && (u.hostname === 'stripe.com' || u.hostname.endsWith('.stripe.com'));
}

// stripeRedirect sends the browser to a Stripe-hosted billing page, or throws if the URL isn't one.
export function stripeRedirect(url: string): void {
  if (!isStripeHostedURL(url)) throw new Error('unexpected billing redirect');
  window.location.href = url;
}
