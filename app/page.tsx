import Grid from "@/components/Grid";
import { getProjects } from "@/lib/store";
import { CONTACT_EMAIL, CONTACT_SUBJECT } from "@/lib/config";

// Pages are rebuilt only when you save in the admin.
export const revalidate = false;

export default async function Home() {
  const projects = (await getProjects()).filter((p) => p.images.length > 0);

  if (!projects.length) {
    return <p className="empty">No projects yet.</p>;
  }

  return (
    <>
    <Grid projects={projects} />
    <footer className="site-footer">
      <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(CONTACT_SUBJECT)}`}>
        <span>Niclas Sellebråten</span>
        <span>Art Director &amp; Type Consultant</span>
        <span>Open for work</span>
      </a>
    </footer>
    </>
  );
}
