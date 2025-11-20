import {
  Table,
  TableBody,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TablePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mission Data</h1>
        <p className="text-muted-foreground">
          Manage and monitor all active missions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Missions</CardTitle>
          <CardDescription>
            A comprehensive list of all missions and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>No missions found in the system.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Mission ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableHead colSpan={8} className="h-24 text-center text-muted-foreground">
                  No data available
                </TableHead>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

