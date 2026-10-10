import { Header } from "@/components/Header";
import { ManageBooking } from "@/components/ManageBooking";

export const metadata = { title: "Mon rendez-vous · SD Beauty Glam", robots: { index: false } };

export default function Page({ params }: { params: { id: string } }) {
  return (<><Header /><ManageBooking id={params.id} /></>);
}
