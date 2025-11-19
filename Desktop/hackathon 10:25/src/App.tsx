import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Home from "@/pages/Home";
import Setup from "@/pages/Setup";
import Race from "@/pages/Race";
import Progress from "@/pages/Progress";
import Settings from "@/pages/Settings";
import MonsterImageTest from "@/pages/MonsterImageTest";
import Social from "@/pages/Social";
import InvitationCode from "@/pages/InvitationCode";
import SocialRace from "@/pages/SocialRace";
import CustomCourseSurvey from "@/components/CustomCourseSurvey";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/race" element={<Race />} />
          <Route path="/social" element={<Social />} />
          <Route path="/invitation-code" element={<InvitationCode />} />
          <Route path="/social-race" element={<SocialRace />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/monster-test" element={<MonsterImageTest />} />
          <Route path="/custom-survey" element={<CustomCourseSurvey />} />
        </Routes>
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              border: '1px solid #374151'
            }
          }}
        />
      </div>
    </Router>
  );
}
