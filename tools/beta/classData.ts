import { CLASS_DATA as LIVE_CLASSES, type ClassInfo } from '../../src/features/class-picker/classData.ts'

export * from '../../src/features/class-picker/classData.ts'
export const CLASS_DATA: ClassInfo[] = [...LIVE_CLASSES, {
  id: 'bellaphone' as ClassInfo['id'], name: 'Bellaphone', element: 'multi', breed: 21,
  imageUrl: '/data/beta-classes/Head_210-64.png',
  imageFUrl: '/data/beta-classes/Head_211-64.png',
}]
