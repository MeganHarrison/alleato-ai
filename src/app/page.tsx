import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, LayoutDashboard, FileText, FolderOpen } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";

export default function HomePage() {
  return (
    <AppLayout>
      <div className="flex items-center justify-center p-8 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-6xl w-full space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Welcome to Alleato AI</h1>
            <p className="text-xl text-muted-foreground">
              Your intelligent business assistant powered by AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  AI Chat Assistant
                </CardTitle>
                <CardDescription>
                  Chat with your AI assistant to search documents and meeting transcripts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/chat">
                  <Button className="w-full">Open AI Assistant</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5" />
                  Admin Dashboard
                </CardTitle>
                <CardDescription>
                  Access analytics, charts, and administrative tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin">
                  <Button className="w-full" variant="outline">Open Admin Dashboard</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
                <CardDescription>
                  Browse and manage your document library
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/tables/documents">
                  <Button className="w-full" variant="outline">View Documents</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Projects
                </CardTitle>
                <CardDescription>
                  Manage your projects and track progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/tables/projects">
                  <Button className="w-full" variant="outline">View Projects</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}