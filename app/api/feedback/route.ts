// app/api/feedback/route.ts
import { NextRequest } from "next/server"
import { writeFile, readFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { FeedbackRequestSchema } from "@/lib/schema"

// 피드백 데이터 파일 경로
const FEEDBACK_DIR = path.join(process.cwd(), "data", "feedback")
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, "feedback.jsonl") // JSONL 형식으로 저장

// 디렉토리 생성 함수
async function ensureDataDir() {
  if (!existsSync(FEEDBACK_DIR)) {
    await mkdir(FEEDBACK_DIR, { recursive: true })
  }
}

// 고유 피드백 ID 생성
function generateFeedbackId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = FeedbackRequestSchema.safeParse(json)
    
    if (!parsed.success) {
      return Response.json({ 
        ok: false, 
        error: "잘못된 피드백 요청입니다." 
      }, { status: 400 })
    }

    const feedbackData = {
      ...parsed.data,
      feedbackId: generateFeedbackId(),
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get("user-agent") || "",
      ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    }

    // 데이터 디렉토리 확인/생성
    await ensureDataDir()

    // JSONL 형식으로 피드백 데이터 추가 (한 줄씩 JSON 객체)
    const feedbackLine = JSON.stringify(feedbackData) + "\n"
    await writeFile(FEEDBACK_FILE, feedbackLine, { flag: "a" }) // append mode

    console.log(`💬 피드백 수집: ${feedbackData.rating} - ${feedbackData.feedbackId}`)

    return Response.json({
      ok: true,
      data: {
        feedbackId: feedbackData.feedbackId,
        message: "피드백이 성공적으로 저장되었습니다."
      }
    })

  } catch (e: any) {
    console.error("피드백 저장 오류:", e)
    return Response.json({ 
      ok: false, 
      error: "피드백 저장 중 오류가 발생했습니다." 
    }, { status: 500 })
  }
}

// 피드백 조회 API (관리자용)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const rating = searchParams.get("rating") // satisfied | needs_improvement
    const adminKey = searchParams.get("key")

    // 간단한 관리자 인증 (실제 운영시에는 더 강력한 인증 필요)
    if (adminKey !== process.env.ADMIN_KEY) {
      return Response.json({ 
        ok: false, 
        error: "접근 권한이 없습니다." 
      }, { status: 403 })
    }

    await ensureDataDir()

    // 피드백 파일이 존재하지 않으면 빈 배열 반환
    if (!existsSync(FEEDBACK_FILE)) {
      return Response.json({
        ok: true,
        data: {
          feedbacks: [],
          total: 0,
          stats: { satisfied: 0, needs_improvement: 0 }
        }
      })
    }

    // JSONL 파일 읽기
    const fileContent = await readFile(FEEDBACK_FILE, "utf-8")
    const lines = fileContent.trim().split("\n").filter(line => line.length > 0)
    
    let feedbacks = lines.map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    }).filter(Boolean)

    // 평점 필터링
    if (rating) {
      feedbacks = feedbacks.filter(fb => fb.rating === rating)
    }

    // 최신순으로 정렬하고 제한
    feedbacks = feedbacks
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    // 통계 계산
    const allFeedbacks = lines.map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    }).filter(Boolean)

    const stats = {
      satisfied: allFeedbacks.filter(fb => fb.rating === "satisfied").length,
      needs_improvement: allFeedbacks.filter(fb => fb.rating === "needs_improvement").length
    }

    return Response.json({
      ok: true,
      data: {
        feedbacks,
        total: allFeedbacks.length,
        stats
      }
    })

  } catch (e: any) {
    console.error("피드백 조회 오류:", e)
    return Response.json({ 
      ok: false, 
      error: "피드백 조회 중 오류가 발생했습니다." 
    }, { status: 500 })
  }
}
