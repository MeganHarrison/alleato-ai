// Test script to verify R2 upload functionality
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

async function testR2Upload() {
  // Cloudflare R2 configuration
  const accountId = 'd1416265449d2a0bae41c45c791270ec';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = 'alleato';

  // Create S3 client for R2
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId || 'test',
      secretAccessKey: secretAccessKey || 'test',
    },
  });

  // Test file content
  const testTranscript = `# Test Meeting Transcript
Meeting ID: test-123
Date: 2025-08-07
Duration: 30 minutes
Transcript: [View Transcript](https://app.fireflies.ai/view/test-123)
Participants: test@example.com

## Transcript
This is a test transcript to verify R2 upload functionality.
`;

  try {
    // Upload test file
    console.log('Uploading test transcript to R2...');
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: 'transcripts/test-meeting-2025-08-07.md',
      Body: testTranscript,
      ContentType: 'text/markdown',
    });

    await s3Client.send(uploadCommand);
    console.log('✅ Successfully uploaded test transcript to R2!');

    // List files to verify
    console.log('\nListing files in R2 bucket...');
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'transcripts/',
      MaxKeys: 10,
    });

    const listResponse = await s3Client.send(listCommand);
    if (listResponse.Contents) {
      console.log('Files in transcripts folder:');
      listResponse.Contents.forEach(file => {
        console.log(`- ${file.Key} (${file.Size} bytes)`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ R2 upload failed:', error.message);
    console.log('\nNote: R2 access requires proper credentials.');
    console.log('The worker will handle this automatically when deployed.');
    return false;
  }
}

// Run test
console.log('🧪 Testing R2 Upload Functionality\n');
testR2Upload();