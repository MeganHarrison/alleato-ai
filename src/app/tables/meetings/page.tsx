import { MeetingsTable } from "@/components/table-meetings";

export default function MeetingsPage() {
  return (
    <div className="@container/main flex flex-1 flex-col pt-8 gap-2">
      <MeetingsTable />
    </div>
  );
}
