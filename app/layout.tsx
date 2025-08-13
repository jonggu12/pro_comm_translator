import "./../styles/globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "분노 → 비즈니스 번역기",
  description: "감정 문장을 한국형 비즈니스 톤으로 즉시 변환",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        {children}
      </body>
    </html>
  )
}
