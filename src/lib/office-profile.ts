export interface OfficeProfile {
  attorneyName: string;
  license: string;
  officeAddress: string;
  officeCity: string;
  secondAttorneyName: string;
  logoDataUrl?: string;
  officePhone?: string;
  /** The attorney's signature image — auto-embedded in attorney certification blocks. */
  signatureDataUrl?: string;
}

export const OFFICE_KEY = 'solo-nadlan-office-v1';

export const EMPTY_OFFICE: OfficeProfile = {
  attorneyName: '',
  license: '',
  officeAddress: '',
  officeCity: '',
  secondAttorneyName: '',
  logoDataUrl: '',
  officePhone: '',
  signatureDataUrl: '',
};

export function getOfficeProfile(): OfficeProfile {
  try {
    const raw = localStorage.getItem(OFFICE_KEY);
    if (!raw) return { ...EMPTY_OFFICE };
    return { ...EMPTY_OFFICE, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_OFFICE };
  }
}

export function saveOfficeProfile(profile: OfficeProfile): void {
  localStorage.setItem(OFFICE_KEY, JSON.stringify(profile));
}
