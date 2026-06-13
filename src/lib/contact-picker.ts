import * as Contacts from 'expo-contacts';
import { showToast } from '../components/ui/Toast';
import { toPhoneInputValue } from './phone';

function pickBestPhone(contact: Contacts.Contact): string | null {
  const phones = contact.phoneNumbers ?? [];
  if (!phones.length) return null;

  const ranked = phones
    .map((entry) => {
      const label = (entry.label ?? '').toLowerCase();
      let score = 0;
      if (/mobile|cell|iphone|main|primary|home/.test(label)) score += 2;
      const digits = (entry.number ?? '').replace(/\D/g, '');
      if (digits.startsWith('234') || digits.startsWith('0')) score += 1;
      if (digits.length >= 10) score += 1;
      return { number: entry.number ?? '', score };
    })
    .sort((a, b) => b.score - a.score);

  const formatted = toPhoneInputValue(ranked[0]?.number ?? '');
  if (formatted.length !== 10) return null;
  return formatted;
}

export async function pickPhoneFromContacts(): Promise<string | null> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    showToast({
      type: 'error',
      text1: 'Contacts access needed',
      text2: 'Allow contacts permission to pick a phone number',
    });
    return null;
  }

  try {
    const contact = await Contacts.presentContactPickerAsync();
    if (!contact) return null;

    const phone = pickBestPhone(contact);
    if (!phone) {
      showToast({
        type: 'error',
        text1: 'No phone number',
        text2: 'The selected contact has no usable number',
      });
      return null;
    }

    return phone;
  } catch {
    showToast({
      type: 'error',
      text1: 'Could not open contacts',
      text2: 'Please try again',
    });
    return null;
  }
}
