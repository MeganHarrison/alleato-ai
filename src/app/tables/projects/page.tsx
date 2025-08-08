import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { ProjectsTableWithSync } from "@/components/projects-table-with-sync"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import data from "./data.json"

export default function Page() {
  return (
          <div className="@container/main flex flex-1 flex-col pt-8 gap-2">
            <ProjectsTableWithSync data={data} />
          </div>
  )
}
