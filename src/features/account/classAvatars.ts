import { CLASS_DATA } from '@/features/class-picker/classData.ts'

export const AVATAR_HEAD_SLOTS = [1, 2] as const

export const CLASS_AVATARS = CLASS_DATA.flatMap(c => AVATAR_HEAD_SLOTS.flatMap(headSlot => (['male', 'female'] as const).map(gender => ({
  classId: c.id,
  gender,
  headSlot,
  url: `${import.meta.env.BASE_URL}avatars/classes/v1/${c.id}${headSlot === 1 ? '' : `-look-${headSlot}`}-${gender === 'male' ? 'm' : 'f'}.webp`,
}))))

const urls = new Set(CLASS_AVATARS.map(a => a.url))

export function isClassAvatarUrl(url: string): boolean {
  return urls.has(url)
}
