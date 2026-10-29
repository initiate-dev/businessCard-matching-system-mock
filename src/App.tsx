import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { DataProvider, useData } from './context/DataContext'
import { Layout } from './components/Layout'
import { LoadingOverlay } from './components/LoadingOverlay'
import { LoginPage } from './pages/LoginPage'
import { ForceChangePasswordPage } from './pages/PasswordForm'
import { PeopleListPage } from './pages/PeopleListPage'
import { PersonFormPage } from './pages/PersonFormPage'
import { PersonDetailPage } from './pages/PersonDetailPage'
import { CompaniesPage } from './pages/CompaniesPage'
import { CompanyPeoplePage } from './pages/CompanyPeoplePage'
import { MatchesPage } from './pages/MatchesPage'
import { IntroductionsPage } from './pages/IntroductionsPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'

/** 旧 URL /introductions/:id は紹介管理の編集モーダルを開く */
function IntroEditRedirect() {
  const { id } = useParams()
  return <Navigate to={`/introductions?edit=${id}`} replace />
}

function Gate() {
  const { me, busy } = useData()
  return (
    <>
      {!me ? (
        <LoginPage />
      ) : me.mustChangePassword ? (
        <ForceChangePasswordPage />
      ) : (
        <Routes>
          <Route element={<Layout />}>
            <Route path="/people" element={<PeopleListPage />} />
            <Route path="/people/new" element={<PersonFormPage key="new" />} />
            <Route path="/people/:id" element={<PersonDetailPage />} />
            <Route path="/people/:id/edit" element={<PersonFormPage />} />
            <Route path="/import" element={<Navigate to="/people?import=1" replace />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/companies/:id" element={<CompanyPeoplePage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/introductions" element={<IntroductionsPage />} />
            <Route path="/introductions/:id" element={<IntroEditRedirect />} />
            <Route path="/tags" element={<Navigate to="/settings?tab=tags" replace />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/matches" replace />} />
          </Route>
        </Routes>
      )}
      <LoadingOverlay show={busy} />
    </>
  )
}

// GitHub Pages ではサイトがフォルダ（/<リポジトリ名>/）の下にあるので、ルーターにもそのフォルダを教える
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <DataProvider>
        <Gate />
      </DataProvider>
    </BrowserRouter>
  )
}
