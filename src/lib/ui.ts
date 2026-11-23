// Home özelleştirmesi (profiles.ui_prefs): kart başlıkları, göster/gizle, Boston saati. Cihazlar arasında eşitlenir.
import { useProfile } from './data';

export interface UiPrefs { titles?: Record<string, string>; hide?: string[]; boston?: boolean; avatar?: string | null; bg?: string | null }
export const HOME_SECTIONS: [string, string][] = [
  ['plan', 'Today’s Plan'], ['routines', 'Reminders'], ['todo', 'To-dos'], ['art', 'Artwork of the Day'], ['ideas', 'On My Mind'],
  ['week', 'This Week'], ['upcoming', 'Upcoming'], ['social', 'Social Media'], ['projects', 'My Projects'],
];
export function useHomePrefs() {
  const ui: UiPrefs = useProfile().data?.ui_prefs ?? {};
  return {
    ui,
    title: (k: string, d: string) => ui.titles?.[k]?.trim() || d,
    visible: (k: string) => !(ui.hide ?? []).includes(k),
    boston: ui.boston !== false,
  };
}
export const bostonTime = (d: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
export const bostonDay = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(d);
