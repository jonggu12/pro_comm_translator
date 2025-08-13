'use client'

import { useState, useEffect } from "react"

type FeedbackItem = {
  feedbackId: string
  originalText: string
  transformedText: string
  rating: "satisfied" | "needs_improvement"
  feedbackType?: string
  comment?: string
  timestamp: string
  transformSettings: {
    purpose: string
    intent: string
    politeness: number
    smartMode: boolean
    analysisResult?: any
  }
}

type FeedbackStats = {
  satisfied: number
  needs_improvement: number
}

export default function AdminPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState<FeedbackStats>({ satisfied: 0, needs_improvement: 0 })
  const [loading, setLoading] = useState(false)
  const [adminKey, setAdminKey] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [filter, setFilter] = useState<"all" | "satisfied" | "needs_improvement">("all")

  const loadFeedbacks = async () => {
    if (!adminKey) return

    setLoading(true)
    try {
      const url = new URL("/api/feedback", window.location.origin)
      url.searchParams.set("key", adminKey)
      url.searchParams.set("limit", "100")
      if (filter !== "all") {
        url.searchParams.set("rating", filter)
      }

      const res = await fetch(url.toString())
      const data = await res.json()

      if (data.ok) {
        setFeedbacks(data.data.feedbacks)
        setStats(data.data.stats)
        setAuthenticated(true)
      } else {
        alert(data.error)
        setAuthenticated(false)
      }
    } catch (e) {
      alert("피드백 로드 실패")
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authenticated && adminKey) {
      loadFeedbacks()
    }
  }, [filter, authenticated])

  const satisfactionRate = stats.satisfied + stats.needs_improvement > 0 
    ? Math.round((stats.satisfied / (stats.satisfied + stats.needs_improvement)) * 100)
    : 0

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ko-KR')
  }

  const PURPOSES_MAP = {
    email: "이메일", report: "보고서", memo: "메모", 
    messenger: "메신저", minutes: "회의록"
  }

  const INTENTS_MAP = {
    request: "요청", decline: "거절", rebuttal: "반박/이견",
    apology: "사과", persuade: "설득", notice: "공지/통지",
    escalation: "에스컬레이션"
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            📊 피드백 관리자
          </h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                관리자 키
              </label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="관리자 키를 입력하세요"
                onKeyPress={(e) => e.key === 'Enter' && loadFeedbacks()}
              />
            </div>
            
            <button
              onClick={loadFeedbacks}
              disabled={!adminKey || loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "로딩 중..." : "접속"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">📊 피드백 관리 대시보드</h1>
            <button
              onClick={() => setAuthenticated(false)}
              className="text-gray-500 hover:text-gray-700 text-sm">
              로그아웃
            </button>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-green-600 text-sm font-medium">만족</div>
              <div className="text-2xl font-bold text-green-800">{stats.satisfied}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-orange-600 text-sm font-medium">개선 필요</div>
              <div className="text-2xl font-bold text-orange-800">{stats.needs_improvement}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-600 text-sm font-medium">총 피드백</div>
              <div className="text-2xl font-bold text-blue-800">{stats.satisfied + stats.needs_improvement}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-purple-600 text-sm font-medium">만족도</div>
              <div className="text-2xl font-bold text-purple-800">{satisfactionRate}%</div>
            </div>
          </div>

          {/* 필터 */}
          <div className="flex space-x-2 mb-4">
            {[
              { value: "all", label: "전체" },
              { value: "satisfied", label: "만족" },
              { value: "needs_improvement", label: "개선 필요" }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as any)}
                className={`px-4 py-2 rounded-lg text-sm ${
                  filter === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 피드백 목록 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">로딩 중...</div>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">피드백이 없습니다.</div>
            </div>
          ) : (
            feedbacks.map(feedback => (
              <div key={feedback.feedbackId} className="bg-white rounded-xl shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      feedback.rating === 'satisfied' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {feedback.rating === 'satisfied' ? '👍 만족' : '🔧 개선 필요'}
                    </span>
                    {feedback.feedbackType && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {feedback.feedbackType}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(feedback.timestamp)}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">원문</div>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      {feedback.originalText}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">변환 결과</div>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      {feedback.transformedText}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>
                    목적: {PURPOSES_MAP[feedback.transformSettings.purpose as keyof typeof PURPOSES_MAP] || feedback.transformSettings.purpose}
                  </span>
                  <span>
                    의도: {INTENTS_MAP[feedback.transformSettings.intent as keyof typeof INTENTS_MAP] || feedback.transformSettings.intent}
                  </span>
                  <span>
                    정중함: {feedback.transformSettings.politeness}
                  </span>
                  <span>
                    {feedback.transformSettings.smartMode ? '🤖 스마트 모드' : '⚙️ 수동 모드'}
                  </span>
                </div>

                {feedback.comment && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm font-medium text-gray-700 mb-1">코멘트</div>
                    <div className="text-sm text-gray-600">{feedback.comment}</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
