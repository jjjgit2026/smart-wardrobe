import { db, uid } from '../../db'
import type { Feedback } from '../../types'

export type FeedbackAction = Feedback['action']

export interface FeedbackContext {
  scene: string
  temp?: number
}

export async function recordFeedback(
  outfitId: string,
  garmentIds: string[],
  action: FeedbackAction,
  ctx: FeedbackContext
): Promise<void> {
  await db.feedback.add({
    id: uid(),
    outfitId,
    garmentIds: garmentIds.slice(),
    action,
    scene: ctx.scene,
    temp: ctx.temp,
    createdAt: Date.now(),
  })
}
