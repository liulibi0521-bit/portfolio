import { useCallback, useState } from "react";
import TopBar from "./components/TopBar";
import Hero from "./components/Hero";
import WorkOverview from "./components/WorkOverview";
import WorkPreview from "./components/WorkPreview";
import ContactPanel from "./components/ContactPanel";
import { worksById } from "./data/site";
import { useBodyLock, useFitCanvas } from "./hooks/useSite";

export default function App() {
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const preview = previewId ? worksById.get(previewId) : undefined;
  useBodyLock(overviewOpen || contactOpen || Boolean(preview));
  useFitCanvas();

  const openWork = useCallback((id: string) => setPreviewId(id), []);
  const openOverview = useCallback(() => setOverviewOpen(true), []);
  const closeOverview = useCallback(() => setOverviewOpen(false), []);
  const openContact = useCallback(() => setContactOpen(true), []);
  const closeContact = useCallback(() => setContactOpen(false), []);
  const closePreview = useCallback(() => setPreviewId(null), []);

  return (
    <div className="canvas">
      <TopBar onOpenContact={openContact} />

      <main>
        <Hero onOpenWork={openWork} onOpenOverview={openOverview} />
      </main>

      {overviewOpen && <WorkOverview onClose={closeOverview} onOpen={openWork} />}
      {contactOpen && <ContactPanel onClose={closeContact} />}

      {preview && (
        <WorkPreview work={preview} onClose={closePreview} onNavigate={openWork} />
      )}
    </div>
  );
}
