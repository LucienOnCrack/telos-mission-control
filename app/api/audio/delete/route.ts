/**
 * Audio File Delete API
 * Deletes audio files from Vercel Blob storage
 */

import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Vercel Blob not configured. Please enable it in Vercel Dashboard.' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }

    console.log('🗑️  Deleting audio file:', url);

    // Delete from Vercel Blob
    await del(url);

    console.log('✅ File deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });

  } catch (error: any) {
    console.error('❌ Delete failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}

