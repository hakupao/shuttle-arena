"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/layout/admin-page-header";
import { useT } from "@/i18n/provider";
import { Users, Trash2, KeyRound, ShieldCheck, User } from "lucide-react";

interface UserItem {
  id: number;
  username: string;
  role: string;
  playerId: number | null;
}

interface UsersResponse {
  users?: UserItem[];
  error?: string;
}

interface UserMutationResponse {
  error?: string;
}

export default function AdminUsersPage() {
  const t = useT();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"athlete" | "admin">("athlete");
  const [creating, setCreating] = useState(false);

  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json() as UsersResponse;
      if (!res.ok) {
        throw new Error(data.error || tRef.current("adminUsers.loadListFailed"));
      }
      setUsers(data.users || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tRef.current("adminUsers.loadListFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error(t("adminUsers.fillRequired"));
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: newRole,
        }),
      });
      if (res.ok) {
        toast.success(t("adminUsers.createSuccess", { name: newUsername }));
        setNewUsername("");
        setNewPassword("");
        fetchUsers();
      } else {
        const err = await res.json() as UserMutationResponse;
        toast.error(err.error || t("adminUsers.createFailed"));
      }
    } catch {
      toast.error(t("adminUsers.networkError"));
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = async (id: number, username: string) => {
    if (!confirm(t("adminUsers.deleteConfirm", { name: username }))) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("adminUsers.deleted"));
        fetchUsers();
      } else {
        const err = await res.json() as UserMutationResponse;
        toast.error(err.error || t("adminUsers.deleteFailed"));
      }
    } catch {
      toast.error(t("adminUsers.networkError"));
    }
  };

  const handleResetPassword = async (id: number) => {
    if (!resetPassword.trim()) {
      toast.error(t("adminUsers.enterNewPassword"));
      return;
    }
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword.trim() }),
      });
      if (res.ok) {
        toast.success(t("adminUsers.passwordReset"));
        setResetUserId(null);
        setResetPassword("");
      } else {
        const err = await res.json() as UserMutationResponse;
        toast.error(err.error || t("adminUsers.resetFailed"));
      }
    } catch {
      toast.error(t("adminUsers.networkError"));
    }
  };

  const admins = users.filter((u) => u.role === "admin");
  const athletes = users.filter((u) => u.role === "athlete");

  if (loading) return <div className="text-center py-12 text-gray-400">{t("adminUsers.loading")}</div>;

  return (
    <div className="admin-page-narrow">
      <AdminPageHeader
        title={t("adminUsers.title")}
        icon={Users}
        iconClassName="w-4.5 h-4.5 text-cyan-600"
        extraBadge={
          <span className="text-xs text-gray-400">{t("adminUsers.counts", { athletes: athletes.length, admins: admins.length })}</span>
        }
      />

      {/* Create User */}
      <Card className="border-gray-200">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs text-gray-400 mb-1 block">{t("adminUsers.username")}</label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={t("adminUsers.username")}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs text-gray-400 mb-1 block">{t("adminUsers.password")}</label>
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("adminUsers.password")}
                type="password"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={newRole === "athlete" ? "default" : "outline"}
                className={`h-8 text-xs ${newRole === "athlete" ? "bg-blue-600" : ""}`}
                onClick={() => setNewRole("athlete")}
              >
                {t("adminUsers.roleAthlete")}
              </Button>
              <Button
                size="sm"
                variant={newRole === "admin" ? "default" : "outline"}
                className={`h-8 text-xs ${newRole === "admin" ? "bg-amber-600" : ""}`}
                onClick={() => setNewRole("admin")}
              >
                {t("adminUsers.roleAdmin")}
              </Button>
            </div>
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700 h-8"
              onClick={createUser}
              disabled={creating || !newUsername.trim() || !newPassword.trim()}
            >
              {creating ? "..." : t("adminUsers.create")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Athletes */}
      {athletes.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-gray-500 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-500" />
            {t("adminUsers.athletesHeading", { n: athletes.length })}
          </h2>
          <div className="space-y-1">
            {athletes.map((u) => (
              <div key={u.id} className="flex items-center justify-between squircle-lg border border-gray-100 bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{u.username}</span>
                  {u.playerId && (
                    <Badge variant="outline" className="text-[10px] border-green-200 text-green-600 px-1.5 py-0">
                      {t("adminUsers.bound")}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {resetUserId === u.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder={t("adminUsers.newPassword")}
                        type="password"
                        className="h-7 w-24 text-xs"
                      />
                      <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={() => handleResetPassword(u.id)}>{t("adminUsers.confirm")}</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setResetUserId(null); setResetPassword(""); }}>{t("adminUsers.cancel")}</Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 text-xs text-gray-400 hover:text-amber-600 gap-1"
                        onClick={() => setResetUserId(u.id)}
                      >
                        <KeyRound className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-gray-300 hover:text-red-500"
                        onClick={() => deleteUser(u.id, u.username)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admins */}
      {admins.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-gray-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            {t("adminUsers.adminsHeading", { n: admins.length })}
          </h2>
          <div className="space-y-1">
            {admins.map((u) => (
              <div key={u.id} className="flex items-center justify-between squircle-lg border border-gray-100 bg-white px-3 py-2">
                <span className="text-sm font-medium text-gray-800">{u.username}</span>
                <div className="flex items-center gap-1">
                  {resetUserId === u.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder={t("adminUsers.newPassword")}
                        type="password"
                        className="h-7 w-24 text-xs"
                      />
                      <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={() => handleResetPassword(u.id)}>{t("adminUsers.confirm")}</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setResetUserId(null); setResetPassword(""); }}>{t("adminUsers.cancel")}</Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 text-xs text-gray-400 hover:text-amber-600 gap-1"
                      onClick={() => setResetUserId(u.id)}
                    >
                      <KeyRound className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
