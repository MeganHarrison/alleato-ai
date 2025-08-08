import AppLayout from "../../../components/layout/AppLayout";

export default function TablesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}