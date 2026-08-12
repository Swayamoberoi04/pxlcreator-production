"use client"

import { useState } from "react"
import { AdminListPage } from "@/components/admin/AdminListPage"
import { StatusBadge } from "@/components/admin/ui/StatusBadge"
import { AdminDrawer } from "@/components/admin/ui/AdminDrawer"
import { FormField, TextArea } from "@/components/admin/ui/FormField"
import type { DataTableColumn } from "@/components/admin/ui/AdminDataTable"
import type { Database } from "@/types/database"

type Profile = Database["public"]["Tables"]["community_profiles"]["Row"]

async function patchProfile(id: string, body: Partial<Profile>) {
  await fetch(`/api/admin/community/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  window.location.reload()
}

export default function CommunityUsersPage() {
  const [banning, setBanning] = useState<Profile | null>(null)
  const [reason, setReason] = useState("")

  const columns: DataTableColumn<Profile>[] = [
    {
      key: "username", header: "Creator",
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-white/85">{p.display_name}</p>
          <p className="truncate text-[0.7rem] text-white/35">@{p.username}</p>
        </div>
      ),
    },
    { key: "reputation_score", header: "Reputation", align: "right", render: (p) => p.reputation_score.toLocaleString() },
    {
      key: "status", header: "Status",
      render: (p) => (
        <div className="flex gap-1.5 flex-wrap">
          {p.is_banned && <StatusBadge label="Banned" tone="danger" />}
          {p.is_verified && <StatusBadge label="Verified" tone="info" />}
          {p.is_premium && <StatusBadge label="Premium" tone="gold" />}
          {!p.is_banned && !p.is_verified && !p.is_premium && <StatusBadge label="Normal" tone="neutral" />}
        </div>
      ),
    },
  ]

  return (
    <>
      <AdminListPage<Profile>
        title="Community Users"
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Community", href: "/admin/community" }, { label: "Users" }]}
        basePath="/api/admin/community/users"
        columns={columns}
        getId={(p) => p.id}
        searchPlaceholder="Search by username or name…"
        filters={[
          { key: "is_banned", label: "Status", options: [
            { value: "all", label: "All" }, { value: "false", label: "Active" }, { value: "true", label: "Banned" },
          ] },
        ]}
        rowActions={(p) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void patchProfile(p.id, { is_verified: !p.is_verified })}
              className="text-[0.75rem] text-white/50 hover:text-gold transition-colors"
            >
              {p.is_verified ? "Unverify" : "Verify"}
            </button>
            {p.is_banned ? (
              <button
                type="button"
                onClick={() => void patchProfile(p.id, { is_banned: false, banned_reason: null, banned_at: null })}
                className="text-[0.75rem] text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Unban
              </button>
            ) : (
              <button type="button" onClick={() => { setBanning(p); setReason("") }} className="text-[0.75rem] text-red-400 hover:text-red-300 transition-colors">
                Ban
              </button>
            )}
          </div>
        )}
      />

      <AdminDrawer
        open={!!banning}
        onClose={() => setBanning(null)}
        title={banning ? `Ban @${banning.username}` : undefined}
        footer={
          <>
            <button type="button" onClick={() => setBanning(null)} className="text-[0.8125rem] text-white/50 hover:text-white/85 transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => banning && void patchProfile(banning.id, { is_banned: true, banned_reason: reason || null, banned_at: new Date().toISOString() })}
              className="rounded-lg bg-red-500/90 px-4 py-2 text-[0.8125rem] font-semibold text-white hover:bg-red-500 transition-colors"
            >
              Confirm Ban
            </button>
          </>
        }
      >
        <FormField label="Reason" hint="Recorded for the audit trail — optional but recommended">
          <TextArea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Repeated spam in channel posts" />
        </FormField>
      </AdminDrawer>
    </>
  )
}
