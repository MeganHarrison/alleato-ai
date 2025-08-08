import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface DocCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export function DocCard({ title, description, href, icon: Icon, badge }: DocCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <Icon className="h-8 w-8 text-primary mb-2" />
            {badge && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                {badge}
              </span>
            )}
          </div>
          <CardTitle className="flex items-center justify-between">
            {title}
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>{description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}