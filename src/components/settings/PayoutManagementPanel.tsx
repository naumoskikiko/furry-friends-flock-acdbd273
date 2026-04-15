import { useState } from "react";
import { useAllPayoutRequests } from "@/hooks/usePayoutDetails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Copy, CheckCircle, Clock, DollarSign, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PayoutManagementPanel = () => {
  const { requests, loading, markAs } = useAllPayoutRequests();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");
  const [selectedRequest, setSelectedRequest] = useState<(typeof requests)[0] | null>(null);

  const filtered = requests.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = r.profile?.full_name?.toLowerCase() || "";
      const username = r.profile?.username?.toLowerCase() || "";
      return name.includes(s) || username.includes(s);
    }
    return true;
  });

  const totalPending = requests.filter(r => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const totalPaid = requests.filter(r => r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const pendingCount = requests.filter(r => r.status === "pending").length;

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleMark = async (id: string, status: "paid" | "pending") => {
    try {
      await markAs(id, status);
      toast({ title: `Marked as ${status}` });
      if (selectedRequest?.id === id) setSelectedRequest(null);
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading payouts…</div>;
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card p-3 petkeep-card-shadow text-center">
          <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-lg font-bold">${totalPending.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-2xl bg-card p-3 petkeep-card-shadow text-center">
          <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
            <CheckCircle className="h-4 w-4" />
          </div>
          <p className="text-lg font-bold">${totalPaid.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Paid</p>
        </div>
        <div className="rounded-2xl bg-card p-3 petkeep-card-shadow text-center">
          <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
            <AlertCircle className="h-4 w-4" />
          </div>
          <p className="text-lg font-bold">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No payout requests found
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className={r.status === "pending" ? "bg-amber-500/5" : ""}>
                  <TableCell className="text-xs">
                    <p className="font-medium">{r.profile?.full_name || "Unknown"}</p>
                    <p className="text-muted-foreground">@{r.profile?.username || "—"}</p>
                  </TableCell>
                  <TableCell className="text-xs font-semibold">${r.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "paid" ? "default" : "secondary"} className={
                      r.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0"
                        : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-0"
                    }>
                      {r.status === "paid" ? "Paid" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedRequest(r)}>
                      View
                    </Button>
                    {r.status === "pending" ? (
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleMark(r.id, "paid")}>
                        Pay
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleMark(r.id, "pending")}>
                        Undo
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <DetailRow label="User" value={selectedRequest.profile?.full_name || "Unknown"} />
                <DetailRow label="Username" value={`@${selectedRequest.profile?.username || "—"}`} />
                <DetailRow label="Role" value={selectedRequest.profile?.role || "—"} />
                <DetailRow label="Amount" value={`$${selectedRequest.amount.toFixed(2)}`} />
                <DetailRow
                  label="Status"
                  value={selectedRequest.status === "paid" ? "✅ Paid" : "⏳ Pending"}
                />
                <DetailRow label="Requested" value={new Date(selectedRequest.created_at).toLocaleString()} />
                {selectedRequest.paid_at && (
                  <DetailRow label="Paid At" value={new Date(selectedRequest.paid_at).toLocaleString()} />
                )}
              </div>

              {selectedRequest.payout_detail ? (
                <div className="rounded-xl border p-3 space-y-2">
                  <p className="text-xs font-bold">Bank Details</p>
                  <DetailRow label="Full Name" value={selectedRequest.payout_detail.full_name} onCopy={() => copyText(selectedRequest.payout_detail!.full_name)} />
                  <DetailRow label="Bank" value={selectedRequest.payout_detail.bank_name} />
                  <DetailRow label="Account #" value={selectedRequest.payout_detail.account_number} onCopy={() => copyText(selectedRequest.payout_detail!.account_number)} />
                  <DetailRow label="Ref #" value={selectedRequest.payout_detail.transaction_reference} onCopy={() => copyText(selectedRequest.payout_detail!.transaction_reference)} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">No bank details on file</p>
              )}

              <div className="flex gap-2">
                {selectedRequest.status === "pending" ? (
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleMark(selectedRequest.id, "paid")}>
                    Mark as Paid
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1" onClick={() => handleMark(selectedRequest.id, "pending")}>
                    Revert to Pending
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow = ({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-muted-foreground">{label}</span>
    <div className="flex items-center gap-1">
      <span className="font-medium">{value}</span>
      {onCopy && (
        <button onClick={onCopy} className="p-0.5 rounded hover:bg-secondary">
          <Copy className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  </div>
);

export default PayoutManagementPanel;
