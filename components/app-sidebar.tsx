"use client"

import * as React from "react"
import {
  LayoutDashboard,
  MessageCircle,
  Search,
  Folder,
  Users,
  FileText,
  Database,
  FileChartLine,
  BookOpen,
  Code2,
  Map,
  UserCircle,
  Settings,
  CreditCard,
  Bell,
  LogOut,
  Building2,
  Activity,
  Files,
  ScrollText,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavTables } from "@/components/nav-tables"
import { NavDocs } from "@/components/nav-docs"
import { NavAccount } from "@/components/nav-account"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/favicon.ico",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Chat",
      url: "/",
      icon: MessageCircle,
    },
    {
      title: "Sync Status",
      url: "/sync-status",
      icon: Activity,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  navTables: [
    {
      title: "Projects",
      url: "/tables/projects",
      icon: Folder,
    },
    {
      title: "Meetings",
      url: "/tables/meetings",
      icon: Users,
    },
    {
      title: "Meeting Transcripts",
      url: "/meetings-list",
      icon: ScrollText,
    },
    {
      title: "Documents",
      url: "/tables/documents",
      icon: Files,
    },
    {
      title: "Clients",
      url: "/tables/clients",
      icon: Building2,
    },
    {
      title: "Reports",
      url: "#",
      icon: FileChartLine,
    },
  ],
  navDocs: [
    {
      title: "Database Schema",
      url: "/database-schema",
      icon: Database,
    },
    {
      title: "API Documentation",
      url: "/docs",
      icon: BookOpen,
    },
    {
      title: "Workers Documentation",
      url: "/docs/workers",
      icon: Code2,
    },
    {
      title: "Site Map",
      url: "/docs/site-map",
      icon: Map,
    },
  ],
  navAccount: [
    {
      title: "Profile",
      url: "/admin/profile",
      icon: UserCircle,
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Billing",
      url: "#",
      icon: CreditCard,
    },
    {
      title: "Notifications",
      url: "#",
      icon: Bell,
    },
    {
      title: "Sign Out",
      url: "/signin",
      icon: LogOut,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <img src="/favicon.ico" alt="Alleato logo" className="w-6 h-6 mr-2 inline-block align-middle" />
                <span className="text-base font-semibold">Alleato</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavTables items={data.navTables} />
        <NavDocs items={data.navDocs} />
        <NavAccount items={data.navAccount} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
