// Temporäre Startseite – wird nach dem "Go" durch die echte
// Login-Seite ersetzt.
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/login");
}
