/**
 * Send OTP via the external SMS gateway.
 *
 * API: GET https://vbspuresult.org.in/Account/SendOtp?mobile={phone}&Name={name}
 * Returns: the OTP as a plain string (e.g. "889249")
 */

const OTP_API_BASE = 'https://vbspuresult.org.in/Account/SendOtp';

/**
 * Send an OTP to a phone number via SMS.
 *
 * @param {string} phone – Phone number (with or without +91 prefix)
 * @param {string} name  – Recipient name
 * @returns {Promise<string>} The OTP that was sent
 */
export async function sendOtp(phone, name = 'User') {
  // Strip country code and non-digits to get a clean 10-digit Indian mobile number
  const cleanPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '');

  const url = `${OTP_API_BASE}?mobile=${encodeURIComponent(cleanPhone)}&Name=${encodeURIComponent(name)}`;

  const res = await fetch(url);

  if (!res.ok) {
    console.error('OTP API error:', res.status, await res.text());
    throw new Error('Failed to send OTP via SMS gateway');
  }

  const otp = (await res.text()).replace(/"/g, '').trim();

  if (!otp || otp.length < 4) {
    throw new Error('Invalid OTP received from SMS gateway');
  }

  return otp;
}
