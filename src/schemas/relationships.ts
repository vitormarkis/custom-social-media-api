import { z } from "zod"

export const relationShipToggleSchema = z.object({
  followed_user_id: z.number().positive(),
})

export type IRelationShipToggle = z.infer<typeof relationShipToggleSchema>