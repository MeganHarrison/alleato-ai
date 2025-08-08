"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Hash, Globe, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SearchResult {
  title: string;
  description: string;
  href: string;
  category: string;
  icon: React.ReactNode;
}

const searchableContent: SearchResult[] = [
  {
    title: "Database Schema",
    description: "Comprehensive overview of all database tables and relationships",
    href: "/database-schema",
    category: "Technical",
    icon: <Database className="h-4 w-4" />
  },
  {
    title: "Workers Documentation",
    description: "Guide to all Cloudflare Workers in the system",
    href: "/docs/workers",
    category: "Technical",
    icon: <Globe className="h-4 w-4" />
  },
  {
    title: "API Reference",
    description: "Complete API documentation with examples",
    href: "/docs/api-reference",
    category: "Developer",
    icon: <Hash className="h-4 w-4" />
  },
  {
    title: "Getting Started",
    description: "Quick start guide for new users",
    href: "/docs/getting-started",
    category: "User Guide",
    icon: <FileText className="h-4 w-4" />
  },
  {
    title: "Site Map",
    description: "Complete navigation overview of the application",
    href: "/docs/site-map",
    category: "Navigation",
    icon: <FileText className="h-4 w-4" />
  },
  {
    title: "Notion Integration",
    description: "Set up and configure Notion synchronization",
    href: "/docs/integrations/notion",
    category: "Integrations",
    icon: <FileText className="h-4 w-4" />
  },
  {
    title: "Projects",
    description: "Manage and track projects",
    href: "/tables/projects",
    category: "Features",
    icon: <FileText className="h-4 w-4" />
  },
  {
    title: "Clients",
    description: "Client relationship management",
    href: "/tables/clients",
    category: "Features",
    icon: <FileText className="h-4 w-4" />
  },
  {
    title: "AI Assistant",
    description: "Chat with the AI assistant",
    href: "/chat",
    category: "Features",
    icon: <FileText className="h-4 w-4" />
  }
];

export function DocSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim()) {
      const filtered = searchableContent.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setSelectedIndex(0);
    } else {
      setResults([]);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          router.push(results[selectedIndex].href);
          setIsOpen(false);
          setQuery('');
        }
      }
      
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, router]);

  return (
    <div className="relative w-full max-w-xl" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documentation... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-4"
        />
      </div>
      
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-background border rounded-lg shadow-lg overflow-hidden z-50">
          <div className="max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <Link
                key={result.href}
                href={result.href}
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                }}
              >
                <div
                  className={`px-4 py-3 hover:bg-muted cursor-pointer border-b last:border-b-0 ${
                    index === selectedIndex ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{result.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{result.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {result.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}