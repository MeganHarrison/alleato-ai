"use client";

import React, { useEffect, useState } from 'react';
import { ClientsSyncButtons } from "./clients-sync-buttons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Client {
  id: number;
  company: string;
  address?: string;
  website?: string;
  status?: string;
  notion_id?: string;
}

export function ClientsTable() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/clients');
      const data = await response.json();
      
      if (data.success) {
        setClients(data.clients);
      } else {
        setError(data.error || 'Failed to fetch clients');
      }
    } catch (err) {
      setError('Failed to fetch clients');
      console.error('Error fetching clients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSyncComplete = () => {
    // Refresh the clients list after sync
    fetchClients();
  };

  if (isLoading) {
    return (
      <div className="@container/main flex flex-1 flex-col pt-8 gap-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="@container/main flex flex-1 flex-col pt-8 gap-4">
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col pt-8 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">
            Manage and sync your clients between D1 and Notion
          </p>
        </div>
        <ClientsSyncButtons onSyncComplete={handleSyncComplete} />
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No clients found. Use the sync buttons to import clients from Notion.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-mono text-sm">{client.id}</TableCell>
                  <TableCell className="font-medium">{client.company}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.address || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {client.website ? (
                      <a 
                        href={client.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {client.website}
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {client.status ? (
                      <Badge 
                        variant={client.status === 'active' ? 'default' : 'secondary'}
                      >
                        {client.status}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {client.notion_id ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        ✓ Synced
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                        Not synced
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}