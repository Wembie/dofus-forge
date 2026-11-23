import { CLASS_DATA } from '@/features/class-picker/classData.ts'

export const CLASS_AVATARS = CLASS_DATA.flatMap(c => (['male', 'female'] as const).map(gender => ({
  classId: c.id,
  gender,
  url: `${import.meta.env.BASE_URL}avatars/classes/v1/${c.id}-${gender === 'male' ? 'm' : 'f'}.webp`,
})))

const urls = new Set(CLASS_AVATARS.map(a => a.url))

export function isClassAvatarUrl(url: string): boolean {
  return urls.has(url)
}
