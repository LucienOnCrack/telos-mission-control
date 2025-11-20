/**
 * Audio File List API
 * Lists all audio files stored in Vercel Blob
 */

import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('⚠️ BLOB_READ_WRITE_TOKEN not configured');
      return NextResponse.json({
        success: true,
        files: [],
        count: 0,
        warning: 'Vercel Blob not configured. Enable it in Vercel Dashboard.',
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    console.log('📋 Fetching audio files list...');

    // List all files with 'audio/' prefix
    const { blobs } = await list({
      prefix: 'audio/',
      limit: 100,
    });

    console.log(`✅ Found ${blobs.length} audio files`);

    // Format the response
    const audioFiles = blobs.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      filename: blob.pathname.split('/').pop()?.replace(/^\d+-/, '') || blob.pathname,
    }));

    return NextResponse.json({
      success: true,
      files: audioFiles,
      count: audioFiles.length,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });

  } catch (error: any) {
    console.error('❌ Failed to list files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}

