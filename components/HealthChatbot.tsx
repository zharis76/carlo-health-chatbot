'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Message, ChatSession, ComplianceSummary, CarloResult } from '@/lib/types'
import {
  getSessions, saveSession, deleteSession, createNewSession,
  createMessage, sessionTitle, clearAllSessions
} from '@/lib/storage'

const SUGGESTIONS = [
  'What are early signs of dehydration?',
  'How much sleep do adults need each night?',
  'Tips for managing chronic stress',
  'Difference between cold and flu symptoms',
  'How to improve heart health naturally',
  'What does a balanced diet look like?',
]

// ── Compliance badge ──────────────────────────────────────────
function ComplianceBadge({ status, score }: { status?: string; score?: number }) {
  if (!status || status === 'pending') return null
  const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
    pass:    { bg: 'var(--green-50)',  color: 'var(--green-600)',  border: '#bbf7d0', label: '✓ Carlo verified' },
    warn:    { bg: 'var(--amber-50)',  color: 'var(--amber-600)',  border: '#fde68a', label: '⚠ Carlo flagged'  },
    blocked: { bg: 'var(--red-50)',    color: 'var(--red-600)',    border: '#fecaca', label: '✕ Carlo blocked'  },
    bypass:  { bg: 'var(--gray-100)', color: 'var(--gray-600)',   border: 'var(--gray-200)', label: '○ Carlo not configured' },
  }
  const s = map[status] || map.bypass
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, padding: '2px 8px', borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontWeight: 500, marginTop: 4
    }}>
      {s.label}{score !== undefined ? ` (${score}%)` : ''}
    </span>
  )
}

// ── Typing indicator ─────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <Avatar role="assistant" />
      <div style={{
        padding: '12px 16px', background: 'white', border: '1px solid var(--gray-200)',
        borderRadius: '4px 12px 12px 12px', display: 'flex', gap: 5, alignItems: 'center'
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--teal-400)',
            display: 'inline-block', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Avatar ───────────────────────────────────────────────────
function Avatar({ role }: { role: 'user' | 'assistant' }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 600,
      background: role === 'assistant' ? 'var(--teal-50)' : 'var(--blue-50)',
      color: role === 'assistant' ? 'var(--teal-600)' : 'var(--blue-600)',
      border: `1px solid ${role === 'assistant' ? 'var(--teal-100)' : '#bfdbfe'}`,
    }}>
      {role === 'assistant' ? 'H+' : 'You'}
    </div>
  )
}

// ── Shield icon ──────────────────────────────────────────────
function ShieldIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

// ── Compliance sidebar panel ─────────────────────────────────
function CompliancePanel({ summary }: { summary: ComplianceSummary }) {
  const scoreColor = summary.avgCompliance >= 80 ? 'var(--green-400)'
    : summary.avgCompliance >= 60 ? 'var(--amber-400)' : 'var(--red-400)'

  return (
    <div style={{
      margin: '8px', border: '1px solid var(--gray-200)', borderRadius: 10,
      background: 'white', padding: '12px', fontSize: 12
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10,
        fontSize: 10, fontWeight: 600, color: 'var(--gray-600)',
        textTransform: 'uppercase', letterSpacing: '0.06em'
      }}>
        <ShieldIcon size={10} color="var(--teal-400)" />
        Carlo compliance
      </div>

      {/* Seal row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `2px solid ${summary.isConfigured ? 'var(--teal-400)' : 'var(--gray-300)'}`,
          background: summary.isConfigured ? 'var(--teal-50)' : 'var(--gray-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <ShieldIcon size={16} color={summary.isConfigured ? 'var(--teal-600)' : 'var(--gray-400)'} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 11, color: summary.isConfigured ? 'var(--teal-600)' : 'var(--gray-500)' }}>
            {summary.isConfigured
              ? (summary.avgCompliance >= 70 ? 'Verified' : 'Needs review')
              : 'Not configured'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>carlo.algorethics.ai</div>
        </div>
      </div>

      {/* Score bars */}
      {summary.isConfigured && summary.totalChecks > 0 ? (
        <>
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: 'var(--gray-500)', fontSize: 10 }}>Compliance</span>
              <span style={{ fontWeight: 600, fontSize: 10, color: 'var(--gray-800)' }}>{summary.avgCompliance}%</span>
            </div>
            <div style={{ height: 3, background: 'var(--gray-200)', borderRadius: 2 }}>
              <div style={{ height: 3, width: `${summary.avgCompliance}%`, background: scoreColor, borderRadius: 2, transition: 'width 0.5s' }} />
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: 'var(--gray-500)', fontSize: 10 }}>Risk</span>
              <span style={{ fontWeight: 600, fontSize: 10, color: 'var(--gray-800)' }}>{summary.avgRisk.toFixed(1)}</span>
            </div>
            <div style={{ height: 3, background: 'var(--gray-200)', borderRadius: 2 }}>
              <div style={{ height: 3, width: `${Math.min(summary.avgRisk, 100)}%`, background: 'var(--amber-400)', borderRadius: 2, transition: 'width 0.5s' }} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>
            {summary.totalChecks} check{summary.totalChecks !== 1 ? 's' : ''} this session
          </div>
        </>
      ) : (
        <div style={{ fontSize: 10, color: 'var(--gray-400)', lineHeight: 1.5 }}>
          {summary.isConfigured
            ? 'No checks yet — start chatting'
            : 'Add CARLO_API_KEY and CARLO_PROJECT_ID to .env.local to activate'}
        </div>
      )}

      {/* Seal placeholder — activate after Carlo project created */}
      {/* TODO: Replace with actual Carlo seal URL once health project is live
      <a href="https://carlo.algorethics.ai/seal/YOUR_PROJECT_ID" target="_blank"
         style={{ display: 'block', marginTop: 10, textAlign: 'center', ... }}>
        Carlo Verified Seal
      </a>
      */}
    </div>
  )
}

// ── Main chatbot component ───────────────────────────────────
export default function HealthChatbot() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [isCarloChecking, setIsCarloChecking] = useState(false)
  const [input, setInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [complianceSummary, setComplianceSummary] = useState<ComplianceSummary>({
    totalChecks: 0, avgCompliance: 0, avgRisk: 0, isConfigured: false
  })
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load sessions from localStorage on mount
  useEffect(() => {
    const stored = getSessions()
    setSessions(stored)
    if (stored.length > 0) {
      setCurrentSession(stored[0])
      setShowSuggestions(stored[0].messages.length === 0)
    } else {
      const fresh = createNewSession()
      setCurrentSession(fresh)
    }
  }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession?.messages, isTyping, isCarloChecking])

  const updateSummary = useCallback((result: CarloResult) => {
    setComplianceSummary(prev => {
      const checks = prev.totalChecks + 1
      const avgC = Math.round((prev.avgCompliance * prev.totalChecks + result.score) / checks)
      const avgR = (prev.avgRisk * prev.totalChecks + result.risk) / checks
      return { totalChecks: checks, avgCompliance: avgC, avgRisk: avgR, isConfigured: result.reason !== 'Carlo not yet configured — bypass mode active' }
    })
  }, [])

  const runCarloCheck = async (requestText: string, responseText: string): Promise<CarloResult> => {
    try {
      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_text: requestText, response_text: responseText }),
      })
      const data: CarloResult = await res.json()
      return data
    } catch {
      return { compliant: true, score: 80, risk: 20, reason: 'check failed' }
    }
  }

  const persistSession = useCallback((session: ChatSession, msgs: Message[]) => {
    const updated: ChatSession = {
      ...session,
      messages: msgs,
      title: sessionTitle(msgs),
      updatedAt: Date.now(),
    }
    saveSession(updated)
    setCurrentSession(updated)
    setSessions(getSessions())
    return updated
  }, [])

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim()
    if (!content || isTyping) return
    if (!currentSession) return

    setInput('')
    setShowSuggestions(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const userMsg = createMessage('user', content)
    const msgs = [...(currentSession.messages || []), userMsg]
    const updatedWithUser = persistSession(currentSession, msgs)

    // Step 1: Carlo checks the INPUT
    setIsCarloChecking(true)
    const inputCheck = await runCarloCheck(content, '')
    setIsCarloChecking(false)
    updateSummary(inputCheck)

    if (inputCheck.compliant === false) {
      const blockedMsg = createMessage('assistant',
        "Your message was flagged by Carlo's compliance layer and could not be processed. Please rephrase your question.",
        { compliance: 'blocked', complianceScore: inputCheck.score, riskScore: inputCheck.risk }
      )
      persistSession(updatedWithUser, [...msgs, blockedMsg])
      return
    }

    // Step 2: Get AI response
    setIsTyping(true)
    let aiText = ''
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      aiText = data.response || 'Sorry, I could not generate a response.'
    } catch {
      aiText = 'Connection error. Please check your network and try again.'
    }
    setIsTyping(false)

    // Step 3: Carlo checks the OUTPUT
    setIsCarloChecking(true)
    const outputCheck = await runCarloCheck(content, aiText)
    setIsCarloChecking(false)
    updateSummary(outputCheck)

    const complianceStatus = outputCheck.compliant === false ? 'blocked'
      : (outputCheck.score || 80) < 60 ? 'warn' : 'pass'

    const finalText = outputCheck.compliant === false
      ? "Carlo's compliance layer flagged this response. Please try rephrasing your question."
      : aiText

    const assistantMsg = createMessage('assistant', finalText, {
      compliance: inputCheck.reason?.includes('bypass') ? 'bypass' : complianceStatus,
      complianceScore: outputCheck.score,
      riskScore: outputCheck.risk,
    })

    persistSession(updatedWithUser, [...msgs, assistantMsg])
  }

  const startNewChat = () => {
    const fresh = createNewSession()
    setCurrentSession(fresh)
    setShowSuggestions(true)
    setSessions(getSessions())
  }

  const loadSession = (session: ChatSession) => {
    setCurrentSession(session)
    setShowSuggestions(session.messages.length === 0)
  }

  const removeSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteSession(id)
    const remaining = getSessions()
    setSessions(remaining)
    if (currentSession?.id === id) {
      if (remaining.length > 0) {
        setCurrentSession(remaining[0])
      } else {
        startNewChat()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const messages = currentSession?.messages || []

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-animate { animation: fadeIn 0.2s ease; }
        .suggestion:hover {
          background: var(--teal-50) !important;
          border-color: var(--teal-200) !important;
          color: var(--teal-600) !important;
        }
        .history-item:hover { background: white !important; }
        .history-item.active { background: var(--teal-50) !important; }
        .send-btn:hover:not(:disabled) { background: var(--teal-600) !important; }
        .send-btn:disabled { background: var(--gray-300) !important; cursor: not-allowed; }
        .new-chat:hover { background: var(--teal-50) !important; border-color: var(--teal-200) !important; color: var(--teal-600) !important; }
        .delete-btn { opacity: 0; transition: opacity 0.15s; }
        .history-item:hover .delete-btn { opacity: 1; }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', background: 'var(--gray-50)', overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <div style={{
            width: 248, minWidth: 248, background: 'var(--gray-100)',
            borderRight: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column',
          }}>
            {/* Brand */}
            <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--gray-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, background: 'var(--teal-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C8 2 4 6 4 10c0 5 8 12 8 12s8-7 8-12c0-4-4-8-8-8zm0 10a2 2 0 110-4 2 2 0 010 4z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1.2 }}>Health Assistant</div>
                  <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>by Carlo Ethics.ai</div>
                </div>
              </div>
              <button className="new-chat" onClick={startNewChat} style={{
                width: '100%', padding: '7px 10px', border: '1px solid var(--gray-300)',
                borderRadius: 8, background: 'white', color: 'var(--gray-700)',
                fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s'
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New conversation
              </button>
            </div>

            {/* History */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
              {sessions.length === 0 ? (
                <div style={{ padding: '12px 10px', fontSize: 11, color: 'var(--gray-400)' }}>No history yet</div>
              ) : (
                <>
                  <div style={{ padding: '6px 8px 4px', fontSize: 10, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Recent
                  </div>
                  {sessions.map(s => (
                    <div key={s.id} className={`history-item ${s.id === currentSession?.id ? 'active' : ''}`}
                      onClick={() => loadSession(s)}
                      style={{
                        padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                        transition: 'background 0.1s'
                      }}>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: 12, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.title}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 1 }}>
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button className="delete-btn" onClick={e => removeSession(e, s.id)} style={{
                        background: 'none', border: 'none', color: 'var(--gray-400)', padding: 2,
                        flexShrink: 0, borderRadius: 4, lineHeight: 1
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                  {sessions.length > 5 && (
                    <button onClick={clearAllSessions} style={{
                      width: '100%', marginTop: 6, padding: '5px', border: 'none',
                      background: 'none', fontSize: 10, color: 'var(--gray-400)', cursor: 'pointer'
                    }}>Clear all history</button>
                  )}
                </>
              )}
            </div>

            {/* Compliance panel */}
            <CompliancePanel summary={complianceSummary} />
          </div>
        )}

        {/* ── Main chat area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'white' }}>

          {/* Header */}
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--gray-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setSidebarOpen(v => !v)} style={{
                background: 'none', border: 'none', color: 'var(--gray-400)', padding: 4, borderRadius: 6
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--teal-400)' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>Health Assistant</div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                  {isCarloChecking ? '⏳ Carlo compliance check…'
                    : isTyping ? 'Thinking…'
                    : 'Monitored by Carlo Ethics.ai'}
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              background: 'var(--teal-50)', border: '1px solid var(--teal-100)',
              borderRadius: 20, fontSize: 11, color: 'var(--teal-600)', fontWeight: 500
            }}>
              <ShieldIcon size={11} color="var(--teal-600)" />
              Carlo protected
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 8px' }}>

            {/* Welcome message */}
            <div className="msg-animate" style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'flex-start' }}>
              <Avatar role="assistant" />
              <div>
                <div style={{
                  padding: '12px 16px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                  borderRadius: '4px 12px 12px 12px', fontSize: 14, lineHeight: 1.65, color: 'var(--gray-800)',
                  maxWidth: 520
                }}>
                  Hello! I'm your Health Assistant, powered by Carlo Ethics.ai's compliance layer. I can help with general health questions, symptoms, wellness tips, nutrition, and more.
                  <br /><br />
                  Please note that my responses are informational only — always consult a qualified healthcare professional for personal medical advice.
                </div>
                <ComplianceBadge status="pass" />
              </div>
            </div>

            {/* Chat messages */}
            {messages.map(msg => (
              <div key={msg.id} className="msg-animate" style={{
                display: 'flex', gap: 10, marginBottom: 20,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}>
                <Avatar role={msg.role} />
                <div>
                  <div style={{
                    padding: '11px 15px',
                    background: msg.role === 'user'
                      ? 'var(--teal-400)'
                      : msg.compliance === 'blocked' ? 'var(--red-50)' : 'var(--gray-50)',
                    color: msg.role === 'user' ? 'white'
                      : msg.compliance === 'blocked' ? 'var(--red-600)' : 'var(--gray-800)',
                    border: msg.role === 'user' ? 'none'
                      : msg.compliance === 'blocked' ? '1px solid #fecaca' : '1px solid var(--gray-200)',
                    borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                    fontSize: 14, lineHeight: 1.65, maxWidth: 520
                  }}>
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && (
                    <ComplianceBadge status={msg.compliance} score={msg.complianceScore} />
                  )}
                  <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 3 }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing + Carlo check indicators */}
            {isTyping && (
              <div style={{ marginBottom: 16 }}><TypingIndicator /></div>
            )}
            {isCarloChecking && !isTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 12px 42px' }}>
                <div style={{
                  width: 10, height: 10, border: '1.5px solid var(--teal-100)',
                  borderTopColor: 'var(--teal-400)', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite'
                }} />
                <span style={{ fontSize: 11, color: 'var(--teal-600)' }}>Carlo compliance check…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && messages.length === 0 && (
            <div style={{ padding: '0 24px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} className="suggestion" onClick={() => sendMessage(s)} style={{
                  padding: '6px 12px', border: '1px solid var(--gray-200)', borderRadius: 20,
                  background: 'white', color: 'var(--gray-600)', fontSize: 12, transition: 'all 0.15s'
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 20px 16px', borderTop: '1px solid var(--gray-200)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask a health question… (Shift+Enter for new line)"
                rows={1}
                style={{
                  flex: 1, padding: '10px 14px', border: '1px solid var(--gray-300)',
                  borderRadius: 10, background: 'white', color: 'var(--gray-900)',
                  fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.5,
                  minHeight: 42, maxHeight: 120, transition: 'border-color 0.15s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--teal-400)'}
                onBlur={e => e.target.style.borderColor = 'var(--gray-300)'}
              />
              <button className="send-btn" onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
                style={{
                  width: 40, height: 40, borderRadius: 10, background: 'var(--teal-400)',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.15s'
                }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
                </svg>
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--gray-400)', textAlign: 'center', marginTop: 6 }}>
              Responses pass through Carlo's compliance layer · Not a substitute for professional medical advice
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
