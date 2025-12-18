#!/usr/bin/env node
/**
 * Cleanup Script for Revoked Tokens
 *
 * This script removes expired revoked tokens from Firestore to prevent
 * database bloat and maintain query performance.
 *
 * Usage:
 *   node scripts/cleanup-revoked-tokens.js
 *
 * Schedule with cron (daily at 2 AM):
 *   0 2 * * * cd /path/to/syshub-api && node scripts/cleanup-revoked-tokens.js >> logs/token-cleanup.log 2>&1
 */

require('dotenv').config()
const { admin } = require('../utils/config')

const BATCH_SIZE = parseInt(process.env.CLEANUP_BATCH_SIZE, 10) || 500
const DRY_RUN = process.env.DRY_RUN === 'true'

async function cleanupExpiredTokens() {
  const startTime = Date.now()
  console.log(`[${new Date().toISOString()}] Starting token cleanup...`)

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No tokens will be deleted')
  }

  try {
    const now = admin.firestore.Timestamp.now()
    let totalDeleted = 0
    let hasMore = true

    // Process in batches to avoid memory issues with large datasets
    while (hasMore) {
      // Query expired tokens
      const expiredTokensQuery = await admin
        .firestore()
        .collection(process.env.COLLECTION_NAME_TOKENS)
        .where('expiresAt', '<', now)
        .limit(BATCH_SIZE)
        .get()

      if (expiredTokensQuery.empty) {
        hasMore = false
        break
      }

      console.log(`Found ${expiredTokensQuery.size} expired tokens in this batch`)

      if (!DRY_RUN) {
        // Delete in batch
        const batch = admin.firestore().batch()

        expiredTokensQuery.docs.forEach((doc) => {
          batch.delete(doc.ref)
        })

        await batch.commit()
        totalDeleted += expiredTokensQuery.size
        console.log(`✓ Deleted ${expiredTokensQuery.size} tokens`)
      } else {
        totalDeleted += expiredTokensQuery.size
        console.log(`Would delete ${expiredTokensQuery.size} tokens (DRY RUN)`)
      }

      // If we got less than BATCH_SIZE, we're done
      if (expiredTokensQuery.size < BATCH_SIZE) {
        hasMore = false
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    if (totalDeleted === 0) {
      console.log(`✓ No expired tokens to clean up (checked in ${duration}s)`)
    } else {
      const action = DRY_RUN ? 'Would delete' : 'Deleted'
      console.log(`✓ ${action} ${totalDeleted} expired token(s) in ${duration}s`)
    }

    // Get current token count for monitoring
    const remainingSnapshot = await admin
      .firestore()
      .collection(process.env.COLLECTION_NAME_TOKENS)
      .count()
      .get()

    console.log(`📊 Remaining revoked tokens in database: ${remainingSnapshot.data().count}`)

    process.exit(0)
  } catch (error) {
    console.error(`❌ Error during token cleanup:`, error)
    process.exit(1)
  }
}

// Run cleanup
cleanupExpiredTokens()
