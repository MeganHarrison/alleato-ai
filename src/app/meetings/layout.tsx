import AppLayout from "../../../components/layout/AppLayout";

export default function MeetingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}