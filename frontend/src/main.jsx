import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import HomePage from './pages/HomePage.jsx'
import TaskDetailPage from './pages/TaskDetailPage.jsx'
import KnowledgePage from './pages/KnowledgePage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
