export interface OfficeProfile {
  attorneyName: string;
  license: string;
  officeAddress: string;
  officeCity: string;
  secondAttorneyName: string;
}

export const OFFICE_KEY = 'solo-nadlan-office-v1';

export const EMPTY_OFFICE: OfficeProfile = {
  attorneyName: '',
  license: '',
  officeAddress: '',
  officeCity: '',
  secondAttorneyName: '',
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
