import { create } from 'zustand'

interface Question {
  id: string
  question_text: string
  category: string
  difficulty?: string
  reference_answer?: string
}

interface SessionState {
  // 当前会话
  currentSessionId: string | null
  questions: Question[]
  currentIndex: number
  answers: Record<number, string>

  // Actions
  startSession: (sessionId: string, questions: Question[]) => void
  setCurrentIndex: (index: number) => void
  setAnswer: (index: number, answer: string) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSessionId: null,
  questions: [],
  currentIndex: 0,
  answers: {},

  startSession: (sessionId, questions) =>
    set({
      currentSessionId: sessionId,
      questions,
      currentIndex: 0,
      answers: {},
    }),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  setAnswer: (index, answer) =>
    set((state) => ({
      answers: { ...state.answers, [index]: answer },
    })),

  clearSession: () =>
    set({
      currentSessionId: null,
      questions: [],
      currentIndex: 0,
      answers: {},
    }),
}))
