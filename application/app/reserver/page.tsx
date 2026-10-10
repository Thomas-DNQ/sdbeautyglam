import { Header } from "@/components/Header";
import { BookingFlow } from "@/components/BookingFlow";

export const metadata = { title: "Réserver · SD Beauty Glam" };

export default function Page() {
  return (
    <>
      <Header cta={false} />
      <BookingFlow />
    </>
  );
}
