// lib/premium.ts - 프리미엄 권한 관리

// 프리미엄 키 검증 (간단한 데모용 - 실제 운영시 DB/결제 시스템 연동 필요)
const getValidPremiumKeys = (): string[] => {
  const envKeys = process.env.PREMIUM_KEYS?.split(',').map(key => key.trim()) || []
  const defaultKeys = [
    "premium_demo_2024",
    "dev_premium_123", 
    "early_access_key"
  ]
  return [...envKeys, ...defaultKeys]
}

export type UserTier = "free" | "premium"

export interface UsageLimit {
  daily: number
  hourly?: number
  model: "gpt-4o-mini" | "gpt-4o"
}

export const USAGE_LIMITS: Record<UserTier, UsageLimit[]> = {
  free: [
    { daily: 5, model: "gpt-4o-mini" }
  ],
  premium: [
    { daily: 50, hourly: 10, model: "gpt-4o-mini" },
    { daily: 10, hourly: 3, model: "gpt-4o" }
  ]
}

export const MODEL_INFO = {
  "gpt-4o-mini": {
    name: "GPT-4o Mini",
    description: "빠르고 효율적인 표준 모델",
    tier: "free" as UserTier,
    cost: "무료",
    speed: "빠름",
    quality: "표준"
  },
  "gpt-4o": {
    name: "GPT-4o",
    description: "최고 품질의 프리미엄 모델",
    tier: "premium" as UserTier,
    cost: "프리미엄",
    speed: "느림",
    quality: "최고"
  }
} as const

// 프리미엄 키 검증
export function validatePremiumKey(key: string): boolean {
  const validKeys = getValidPremiumKeys()
  return validKeys.includes(key)
}

// 사용자 티어 확인
export function getUserTier(premiumKey?: string): UserTier {
  if (premiumKey && validatePremiumKey(premiumKey)) {
    return "premium"
  }
  return "free"
}

// 모델 사용 권한 확인
export function canUseModel(model: "gpt-4o-mini" | "gpt-4o", userTier: UserTier): boolean {
  const modelInfo = MODEL_INFO[model]
  
  if (modelInfo.tier === "free") {
    return true // 누구나 무료 모델 사용 가능
  }
  
  return userTier === "premium" // 프리미엄 모델은 프리미엄 사용자만
}

// 사용량 제한 확인
export function getUsageLimit(userTier: UserTier, model: "gpt-4o-mini" | "gpt-4o"): UsageLimit | null {
  const limits = USAGE_LIMITS[userTier]
  return limits.find(limit => limit.model === model) || null
}

// 로컬스토리지 키 생성
export function getUsageKey(model: "gpt-4o-mini" | "gpt-4o"): string {
  return `pct-usage-${model}`
}

// 모델별 사용량 체크
export function checkUsageLimit(model: "gpt-4o-mini" | "gpt-4o", userTier: UserTier): {
  canUse: boolean
  remaining: number
  limit: number
} {
  const usageLimit = getUsageLimit(userTier, model)
  
  if (!usageLimit) {
    return { canUse: false, remaining: 0, limit: 0 }
  }

  const key = getUsageKey(model)
  const today = new Date().toISOString().slice(0, 10)
  
  try {
    const raw = localStorage.getItem(key)
    let used = 0
    
    if (raw) {
      const data = JSON.parse(raw)
      if (data.date === today) {
        used = data.used || 0
      }
    }
    
    const remaining = Math.max(0, usageLimit.daily - used)
    
    return {
      canUse: remaining > 0,
      remaining,
      limit: usageLimit.daily
    }
  } catch {
    return {
      canUse: true,
      remaining: usageLimit.daily,
      limit: usageLimit.daily
    }
  }
}

// 사용량 증가
export function incrementUsage(model: "gpt-4o-mini" | "gpt-4o"): void {
  const key = getUsageKey(model)
  const today = new Date().toISOString().slice(0, 10)
  
  try {
    const raw = localStorage.getItem(key)
    let data = { date: today, used: 0 }
    
    if (raw) {
      const existing = JSON.parse(raw)
      if (existing.date === today) {
        data.used = (existing.used || 0) + 1
      } else {
        data.used = 1
      }
    } else {
      data.used = 1
    }
    
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error("사용량 업데이트 실패:", e)
  }
}

// 개발 모드에서 사용량 리셋
export function resetUsageForDev(): void {
  if (process.env.NODE_ENV === 'development') {
    Object.keys(MODEL_INFO).forEach(model => {
      localStorage.removeItem(getUsageKey(model as keyof typeof MODEL_INFO))
    })
  }
}

// 비용 정보 (데모용)
export const COST_INFO = {
  "gpt-4o-mini": {
    inputCost: 0.15, // per 1M tokens (USD)
    outputCost: 0.6,
    typical: "~$0.001/request"
  },
  "gpt-4o": {
    inputCost: 5.0, // per 1M tokens (USD)
    outputCost: 15.0,
    typical: "~$0.02/request"
  }
}
