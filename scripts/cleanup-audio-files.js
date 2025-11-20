#!/usr/bin/env node

/**
 * Audio Files Cleanup Script
 * Lists and optionally deletes audio files from Vercel Blob storage
 * 
 * Usage:
 *   node scripts/cleanup-audio-files.js list              # List all files
 *   node scripts/cleanup-audio-files.js delete <url>     # Delete specific file
 *   node scripts/cleanup-audio-files.js delete-all       # Delete all files (use with caution!)
 */

const { list, del } = require('@vercel/blob');

async function listAudioFiles() {
  console.log('📋 Fetching all audio files from Vercel Blob...\n');
  
  try {
    const { blobs } = await list({
      prefix: 'audio/',
      limit: 1000,
    });

    if (blobs.length === 0) {
      console.log('✅ No audio files found in Vercel Blob storage.');
      return [];
    }

    console.log(`Found ${blobs.length} audio files:\n`);
    console.log('─'.repeat(120));
    console.log('FILENAME'.padEnd(40), 'SIZE'.padEnd(15), 'UPLOADED'.padEnd(20), 'URL');
    console.log('─'.repeat(120));

    blobs.forEach((blob, index) => {
      const filename = blob.pathname.split('/').pop()?.replace(/^\d+-/, '') || blob.pathname;
      const size = formatFileSize(blob.size);
      const date = new Date(blob.uploadedAt).toLocaleString();
      
      console.log(
        `${(index + 1).toString().padStart(2, '0')}. ${filename.padEnd(35)}`,
        size.padEnd(15),
        date.padEnd(20),
        blob.url
      );
    });
    
    console.log('─'.repeat(120));
    console.log(`\nTotal: ${blobs.length} files\n`);
    
    // Check for duplicates
    const filenames = blobs.map(b => b.pathname.split('/').pop()?.replace(/^\d+-/, ''));
    const duplicates = filenames.filter((name, index) => filenames.indexOf(name) !== index);
    
    if (duplicates.length > 0) {
      console.log('⚠️  WARNING: Found duplicate filenames:');
      [...new Set(duplicates)].forEach(name => {
        const dupes = blobs.filter(b => b.pathname.split('/').pop()?.replace(/^\d+-/, '') === name);
        console.log(`\n   "${name}" appears ${dupes.length} times:`);
        dupes.forEach(d => console.log(`   - ${d.url} (${formatFileSize(d.size)}, ${new Date(d.uploadedAt).toLocaleString()})`));
      });
      console.log();
    }

    return blobs;
    
  } catch (error) {
    console.error('❌ Error listing files:', error.message);
    process.exit(1);
  }
}

async function deleteFile(url) {
  console.log(`🗑️  Deleting file: ${url}\n`);
  
  try {
    await del(url);
    console.log('✅ File deleted successfully!\n');
  } catch (error) {
    console.error('❌ Error deleting file:', error.message);
    process.exit(1);
  }
}

async function deleteAllFiles() {
  const blobs = await listAudioFiles();
  
  if (blobs.length === 0) {
    return;
  }

  console.log('⚠️  WARNING: You are about to delete ALL audio files!');
  console.log('This action cannot be undone.\n');
  
  // In a script, we'll just proceed (user should be careful with this command)
  console.log('Deleting all files...\n');
  
  let deleted = 0;
  let failed = 0;
  
  for (const blob of blobs) {
    try {
      await del(blob.url);
      deleted++;
      console.log(`✅ Deleted: ${blob.pathname.split('/').pop()}`);
    } catch (error) {
      failed++;
      console.error(`❌ Failed to delete: ${blob.pathname.split('/').pop()} - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Summary: ${deleted} deleted, ${failed} failed\n`);
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function showHelp() {
  console.log(`
Audio Files Cleanup Script
===========================

Usage:
  node scripts/cleanup-audio-files.js list              # List all files
  node scripts/cleanup-audio-files.js delete <url>     # Delete specific file
  node scripts/cleanup-audio-files.js delete-all       # Delete all files (CAUTION!)

Examples:
  node scripts/cleanup-audio-files.js list
  node scripts/cleanup-audio-files.js delete https://...blob.vercel-storage.com/audio/123-file.m4a
  node scripts/cleanup-audio-files.js delete-all

Environment Variables Required:
  BLOB_READ_WRITE_TOKEN    # Vercel Blob storage token
`);
}

// Main
async function main() {
  const command = process.argv[2];
  
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ Error: BLOB_READ_WRITE_TOKEN environment variable not set\n');
    console.log('Run: vercel env pull .env.local\n');
    process.exit(1);
  }

  switch (command) {
    case 'list':
      await listAudioFiles();
      break;
      
    case 'delete':
      const url = process.argv[3];
      if (!url) {
        console.error('❌ Error: Please provide a URL to delete\n');
        showHelp();
        process.exit(1);
      }
      await deleteFile(url);
      break;
      
    case 'delete-all':
      await deleteAllFiles();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      console.error('❌ Error: Unknown command\n');
      showHelp();
      process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

