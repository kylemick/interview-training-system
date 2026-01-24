import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import TrainingPlan from './pages/TrainingPlan'
import Practice from './pages/Practice'
import Feedback from './pages/Feedback'
import Progress from './pages/Progress'
import Settings from './pages/Settings'
import InterviewMemory from './pages/InterviewMemory'
import Layout from './components/Layout'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/plan" element={<TrainingPlan />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/memory" element={<InterviewMemory />} />
      </Routes>
    </Layout>
  )
}

export default App
