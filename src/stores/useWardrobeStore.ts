import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db, uid } from '../db'
import { feedbackRepo, garmentsRepo, outfitsRepo, wearLogsRepo } from '../db/repositories'
import type { Feedback, Garment, Outfit, WearLog } from '../types'
import { deriveGarmentRules } from '../services/rules/derive'
import { washThreshold } from '../services/rules/washRules'

export const useWardrobeStore = defineStore('wardrobe', () => {
  const garments = ref<Garment[]>([])
  const outfits = ref<Outfit[]>([])
  const wearLogs = ref<WearLog[]>([])
  const feedback = ref<Feedback[]>([])

  async function refresh() {
    const [g, o, w, f] = await Promise.all([
      garmentsRepo.all(),
      outfitsRepo.all(),
      wearLogsRepo.all(),
      feedbackRepo.all(),
    ])
    garments.value = g
    outfits.value = o
    wearLogs.value = w
    feedback.value = f
  }

  const available = computed(() => garments.value.filter((g) => g.status === 'available'))
  const toWash = computed(() => garments.value.filter((g) => g.status === 'needsWash'))
  const todayLogs = computed(() => {
    const key = new Date().toISOString().slice(0, 10)
    return wearLogs.value.filter((l) => !l.isUndone && l.dateKey === key)
  })

  async function addGarment(g: Garment) {
    await garmentsRepo.add(g)
    await refresh()
  }

  async function updateGarment(g: Garment) {
    await garmentsRepo.put({ ...g, updatedAt: Date.now() })
    await refresh()
  }

  async function deleteGarment(id: string) {
    await garmentsRepo.delete(id)
    await refresh()
  }

  async function saveOutfit(o: Outfit) {
    await outfitsRepo.put(o)
    await refresh()
  }

  async function clearAll() {
    await db.transaction('rw', db.garments, db.outfits, db.wearLogs, db.feedback, async () => {
      await Promise.all([
        db.garments.clear(),
        db.outfits.clear(),
        db.wearLogs.clear(),
        db.feedback.clear(),
      ])
    })
    await refresh()
  }

  async function loadDemo() {
    const now = Date.now()
    type DemoSeed = Pick<Garment, 'category' | 'subCategory' | 'colorName' | 'dominantColor' | 'thickness' | 'sleeveLength' | 'materialLook' | 'styleTags' | 'sceneBlacklist'>
    const seeds: DemoSeed[] = [
      { category: 'top', subCategory: '白T恤', colorName: '白色', dominantColor: '#F5F3EC', thickness: 1, sleeveLength: 'short', materialLook: '棉', styleTags: ['休闲'], sceneBlacklist: ['正式'] },
      { category: 'top', subCategory: '燕麦针织', colorName: '燕麦色', dominantColor: '#D9C7AC', thickness: 3, sleeveLength: 'long', materialLook: '针织', styleTags: ['通勤'], sceneBlacklist: [] },
      { category: 'top', subCategory: '深灰卫衣', colorName: '深灰色', dominantColor: '#5B5B5B', thickness: 4, sleeveLength: 'long', materialLook: '棉', styleTags: ['休闲'], sceneBlacklist: ['正式'] },
      { category: 'bottom', subCategory: '蓝色牛仔裤', colorName: '蓝色', dominantColor: '#4A6E96', thickness: 3, sleeveLength: 'none', materialLook: '牛仔', styleTags: ['休闲'], sceneBlacklist: ['正式'] },
      { category: 'bottom', subCategory: '黑色西装裤', colorName: '黑色', dominantColor: '#2E2E2E', thickness: 2, sleeveLength: 'none', materialLook: '西装面料', styleTags: ['通勤', '正式'], sceneBlacklist: [] },
      { category: 'outerwear', subCategory: '卡其风衣', colorName: '卡其色', dominantColor: '#B49A6C', thickness: 3, sleeveLength: 'long', materialLook: '棉', styleTags: ['通勤'], sceneBlacklist: [] },
      { category: 'outerwear', subCategory: '藏青羽绒服', colorName: '藏青色', dominantColor: '#243B57', thickness: 5, sleeveLength: 'long', materialLook: '羽绒', styleTags: ['休闲'], sceneBlacklist: ['正式'] },
      { category: 'onePiece', subCategory: '黑色连衣裙', colorName: '黑色', dominantColor: '#222222', thickness: 2, sleeveLength: 'short', materialLook: '雪纺', styleTags: ['正式'], sceneBlacklist: [] },
      { category: 'shoes', subCategory: '白色运动鞋', colorName: '白色', dominantColor: '#F5F3EC', thickness: 2, sleeveLength: 'none', materialLook: '皮革', styleTags: ['休闲'], sceneBlacklist: ['正式'] },
      { category: 'shoes', subCategory: '棕色皮鞋', colorName: '棕色', dominantColor: '#6B4F3A', thickness: 3, sleeveLength: 'none', materialLook: '皮革', styleTags: ['通勤', '正式'], sceneBlacklist: [] },
      { category: 'shoes', subCategory: '黑色短靴', colorName: '黑色', dominantColor: '#2E2E2E', thickness: 4, sleeveLength: 'none', materialLook: '皮革', styleTags: ['休闲'], sceneBlacklist: ['正式'] },
    ]
    await db.transaction('rw', db.garments, async () => {
      for (const seed of seeds) {
        const rules = deriveGarmentRules(seed)
        const id = uid()
        await db.garments.add({
          ...seed,
          id,
          ...rules,
          washThreshold: washThreshold(seed.category, seed.subCategory, seed.materialLook),
          status: 'available',
          wearCount: Math.floor(Math.random() * 8),
          wearsSinceWash: Math.floor(Math.random() * 3),
          isHumanCorrected: true,
          createdAt: now + Math.random(),
          updatedAt: now,
        } as Garment)
      }
    })
    await refresh()
  }

  return {
    garments, outfits, wearLogs, feedback,
    available, toWash, todayLogs,
    refresh, addGarment, updateGarment, deleteGarment, saveOutfit, clearAll, loadDemo,
  }
})
