'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PenTool, Copy, Check, Hash, Save } from 'lucide-react'
import Header from '@/components/Header'

type Step = 'input' | 'titles' | 'content' | 'done'

const TOPIC_TYPES = ['정보성', '리뷰', '비교분석', '체험기', '노하우/팁']
const TONES = [
  { value: '해요', label: '~해요 (친근한)' },
  { value: '합니다', label: '~합니다 (존댓말)' },
  { value: '한다', label: '~한다 (반말)' },
]
const WORD_COUNTS = [500, 1000, 1500, 2000, 3000]

export default function WritePage() {
  return (
    <Suspense>
      <WritePageInner />
    </Suspense>
  )
}

function WritePageInner() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('input')
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')
  const [topicType, setTopicType] = useState('정보성')
  const [tone, setTone] = useState('해요')
  const [wordCount, setWordCount] = useState(1500)
  const [emphasis, setEmphasis] = useState('')
  const [titles, setTitles] = useState<string[]>([])
  const [selectedTitle, setSelectedTitle] = useState('')
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState<{ blog: string[]; instagram: string[] }>({ blog: [], instagram: [] })
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const kw = searchParams.get('keyword')
    if (kw) setKeyword(kw)
  }, [searchParams])

  const generateTitles = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/write/generate-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, topicType }),
      })
      const data = await res.json()
      if (data.titles) {
        setTitles(data.titles)
        setStep('titles')
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const generateContent = async () => {
    setLoading(true)
    setContent('')
    setStep('content')
    try {
      const res = await fetch('/api/write/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, title: selectedTitle, wordCount, tone, emphasisContent: emphasis }),
      })
      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let result = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        result += chunk
        setContent(result)
      }

      // Generate hashtags
      const hashRes = await fetch('/api/write/generate-hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, title: selectedTitle, content: result }),
      })
      const hashData = await hashRes.json()
      if (hashData.blog) setHashtags(hashData)

      setStep('done')
    } catch { /* ignore */ }
    setLoading(false)
  }

  const copyAll = () => {
    const text = `${selectedTitle}\n\n${content}\n\n${hashtags.blog.join(' ')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveContent = async () => {
    await fetch('/api/write/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, title: selectedTitle, content, hashtags, wordCount: content.length, tone }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const seoScore = content ? Math.min(100, Math.round(
    (content.length >= 1000 ? 20 : content.length / 50) +
    ((content.match(new RegExp(keyword, 'g'))?.length || 0) >= 3 ? 20 : 10) +
    ((content.match(/##/g)?.length || 0) >= 3 ? 20 : 10) +
    (content.split('\n\n').length >= 4 ? 20 : 10) +
    (hashtags.blog.length >= 5 ? 20 : 10)
  )) : 0

  return (
    <>
      <Header title="AI 글쓰기" />
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">

        {/* Step 1: Input */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PenTool className="w-5 h-5 text-accent" />
            글쓰기 설정
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">키워드</label>
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="검색 노출 키워드를 입력하세요"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">글 타입</label>
              <div className="flex flex-wrap gap-2">
                {TOPIC_TYPES.map(t => (
                  <button key={t} onClick={() => setTopicType(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${topicType === t ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">글자 수</label>
                <select value={wordCount} onChange={e => setWordCount(Number(e.target.value))} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  {WORD_COUNTS.map(w => <option key={w} value={w}>{w.toLocaleString()}자</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">말투</label>
                <select value={tone} onChange={e => setTone(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">강조할 내용 <span className="text-gray-400">(선택)</span></label>
              <textarea
                value={emphasis}
                onChange={e => setEmphasis(e.target.value)}
                placeholder="특별히 강조하고 싶은 내용이 있다면 입력하세요"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <button
              onClick={generateTitles}
              disabled={!keyword.trim() || loading}
              className="w-full bg-accent text-white py-2.5 rounded-lg font-medium hover:bg-accent/90 transition disabled:opacity-50"
            >
              {loading ? '제목 생성 중...' : '제목 생성하기'}
            </button>
          </div>
        </div>

        {/* Step 2: Title Selection */}
        {titles.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="text-sm font-semibold mb-3">제목을 선택하세요</h3>
            <div className="space-y-2">
              {titles.map((t, i) => (
                <button key={i} onClick={() => setSelectedTitle(t)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${selectedTitle === t ? 'border-accent bg-accent/5 text-accent' : 'border-border hover:border-accent/50'}`}
                >{t}</button>
              ))}
            </div>
            {selectedTitle && (
              <button onClick={generateContent} disabled={loading}
                className="mt-4 w-full bg-accent text-white py-2.5 rounded-lg font-medium hover:bg-accent/90 transition disabled:opacity-50"
              >{loading ? '본문 생성 중...' : '본문 생성하기'}</button>
            )}
          </div>
        )}

        {/* Step 3+: Content Output */}
        {content && (
          <div className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">{selectedTitle}</h3>
              <div className="flex gap-2">
                <button onClick={saveContent} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-success/10 text-success rounded-lg hover:bg-success/20 transition">
                  {saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                  {saved ? '저장됨' : '저장'}
                </button>
                <button onClick={copyAll} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? '복사됨' : '전체 복사'}
                </button>
              </div>
            </div>
            <div ref={contentRef} className="prose prose-sm max-w-none text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {content}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
              <span>{content.length.toLocaleString()}자</span>
              <span>SEO 점수: {seoScore}/100</span>
            </div>
          </div>
        )}

        {/* Hashtags */}
        {step === 'done' && hashtags.blog.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-accent" />
              해시태그
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">네이버 블로그</p>
                <div className="flex flex-wrap gap-1">
                  {hashtags.blog.map((t, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{t}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">인스타그램</p>
                <div className="flex flex-wrap gap-1">
                  {hashtags.instagram.map((t, i) => (
                    <span key={i} className="px-2 py-1 bg-accent/5 rounded text-xs text-accent">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
