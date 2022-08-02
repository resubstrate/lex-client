import logo from './logo.svg';
import './App.css';
import Register from './components/Register'
import Login from './components/Login'
import Home from './components/Home';
import Layout from './components/Layout';
import Annotator from './components/Annotator';
import Admin from './components/Admin';
import Missing from './components/Missing';
import Unauthorized from './components/Unauthorized';
import Research from './components/Research';
import LinkPage from './components/LinkPage';
import RequireAuth from './components/RequireAuth';
import PersistLogin from './components/PersistLogin';
import Annotation from './components/Annotation';
import { Routes, Route } from 'react-router-dom';

const ROLES = {
  'Annotator': 1,
  'Researcher': 2,
  'Admin': 4
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout/>}>
        {/* public routes */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="linkpage" element={<LinkPage />} />
        <Route path="unauthorized" element={<Unauthorized />} />

        {/* we want to protect these routes */}
        <Route element={<PersistLogin />}>
          <Route element={<RequireAuth allowedRoles={[ROLES.Annotator, ROLES.Researcher, ROLES.Admin]} />}>
            <Route path="/" element={<Home />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={[ROLES.Annotator]} />}>
            <Route path="annotator" element={<Annotator />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={[ROLES.Annotator]} />}>
            <Route path="annotation" element={<Annotation />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={[ROLES.Admin]} />}>
            <Route path="admin" element={<Admin />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={[ROLES.Researcher, ROLES.Admin]} />}>
            <Route path="research" element={<Research />} />
          </Route>
        </Route>

        {/* catch all */}
        <Route path="*" element={<Missing />} />
      </Route>
    </Routes>
  );
}

export default App;
