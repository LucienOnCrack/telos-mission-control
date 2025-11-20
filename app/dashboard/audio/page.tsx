"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Upload, Trash2, Play, Copy, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AudioFile {
  url: string
  pathname: string
  size: number
  uploadedAt: Date
  filename: string
}

export default function AudioFilesPage() {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchAudioFiles()
  }, [])

  const fetchAudioFiles = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/audio/list")
      
      if (!response.ok) {
        const data = await response.json()
        console.error("❌ Failed to fetch audio files:", data)
        alert(`Error fetching audio files:\n${data.error || 'Unknown error'}`)
        return
      }
      
      const data = await response.json()
      if (data.files) {
        setAudioFiles(data.files)
      }
    } catch (error: any) {
      console.error("❌ ERROR fetching audio files:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
      alert('⚠️ Invalid file type\n\nPlease upload MP3, WAV, or M4A files only.')
      e.target.value = ''
      return
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert('⚠️ File too large\n\nMaximum file size is 10MB.\n\nYour file: ' + (file.size / 1024 / 1024).toFixed(2) + 'MB')
      e.target.value = ''
      return
    }

    setUploading(true)
    console.log('📤 Uploading:', file.name)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Upload successful:', data.url)
        alert(`✅ Upload successful!\n\nFile: ${data.filename}\nSize: ${(data.size / 1024 / 1024).toFixed(2)}MB\n\nYou can now use this audio file in your voice campaigns.`)
        fetchAudioFiles()
      } else {
        console.error('❌ Upload failed:', data)
        alert(`❌ Upload failed:\n\n${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error)
      alert(`❌ Upload error:\n\n${error.message}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (url: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?\n\nThis action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/audio/delete?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ File deleted:', filename)
        alert(`✅ File deleted successfully!\n\n${filename}`)
        fetchAudioFiles()
      } else {
        console.error('❌ Delete failed:', data)
        alert(`❌ Delete failed:\n\n${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('❌ Delete error:', error)
      alert(`❌ Delete error:\n\n${error.message}`)
    }
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const handlePlayAudio = (url: string) => {
    const audio = new Audio(url)
    audio.play()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audio Files</h1>
          <p className="text-muted-foreground">
            Upload and manage audio files for voice campaigns
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Audio File</CardTitle>
          <CardDescription>
            Upload MP3, WAV, or M4A files (max 10MB). Files will be hosted on Vercel Blob storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="file-upload">Select Audio File</Label>
              <div className="flex gap-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,.mp3,.wav,.m4a"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploading && (
                  <Button disabled>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: 8kHz WAV for best call quality • MP3 and M4A also supported
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Files ({audioFiles.length})</CardTitle>
          <CardDescription>
            Manage your audio files. Copy the URL to use in voice campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading audio files...
                    </TableCell>
                  </TableRow>
                ) : audioFiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No audio files yet. Upload your first file above.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  audioFiles.map((file) => (
                    <TableRow key={file.url}>
                      <TableCell className="font-medium">
                        {file.filename}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatFileSize(file.size)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <code className="text-xs text-muted-foreground truncate block">
                          {file.url}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePlayAudio(file.url)}
                            title="Play audio"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyUrl(file.url)}
                            title="Copy URL"
                          >
                            {copiedUrl === file.url ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(file.url, file.filename)}
                            title="Delete file"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

